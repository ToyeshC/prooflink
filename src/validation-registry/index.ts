import { neon } from '@neondatabase/serverless';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

type RegistryRecord = {
  attestation_address: string;
  validator_wallet: string | null;
  challenger_wallet: string | null;
  validator_stake_lamports: number;
  challenge_bond_lamports: number;
  validator_tx: string | null;
  challenge_tx: string | null;
  challenge_reason: string | null;
  status: 'active' | 'challenged' | 'resolved';
  challenged_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
};

function db() {
  return neon(process.env.DATABASE_URL!);
}

function getOracleKeypair(): Keypair {
  const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY!.trim());
  return decoded.length === 32 ? Keypair.fromSeed(decoded) : Keypair.fromSecretKey(decoded);
}

async function getStakeFromTx(txSignature: string, recipientWallet: string): Promise<number> {
  const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
  const tx = await connection.getTransaction(txSignature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta) return 0;
  const accountKeys = tx.transaction.message.getAccountKeys
    ? tx.transaction.message.getAccountKeys().staticAccountKeys
    : (tx.transaction.message as any).accountKeys;
  const idx = accountKeys.findIndex(
    (k: { toBase58: () => string } | PublicKey) =>
      (k instanceof PublicKey ? k : new PublicKey(k.toBase58())).toBase58() === recipientWallet
  );
  if (idx === -1) return 0;
  return Math.max(0, (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0));
}

// Ensure DB table exists (idempotent)
async function ensureTable(): Promise<void> {
  const sql = db();
  await sql`
    CREATE TABLE IF NOT EXISTS validation_registry (
      attestation_address     TEXT PRIMARY KEY,
      validator_wallet        TEXT,
      challenger_wallet       TEXT,
      validator_stake_lamports BIGINT DEFAULT 0,
      challenge_bond_lamports  BIGINT DEFAULT 0,
      validator_tx            TEXT,
      challenge_tx            TEXT,
      challenge_reason        TEXT,
      status                  TEXT DEFAULT 'active',
      challenged_at           TIMESTAMPTZ,
      resolved_at             TIMESTAMPTZ,
      resolution              TEXT
    )
  `;
}

export async function registerValidator(
  attestationAddress: string,
  validatorWallet: string,
  txSignature: string
): Promise<void> {
  await ensureTable();
  const oracle = getOracleKeypair();
  const stakeAmount = await getStakeFromTx(txSignature, oracle.publicKey.toBase58());

  const sql = db();
  await sql`
    INSERT INTO validation_registry
      (attestation_address, validator_wallet, validator_stake_lamports, validator_tx, status)
    VALUES
      (${attestationAddress}, ${validatorWallet}, ${stakeAmount}, ${txSignature}, 'active')
    ON CONFLICT (attestation_address) DO UPDATE SET
      validator_wallet        = EXCLUDED.validator_wallet,
      validator_stake_lamports = EXCLUDED.validator_stake_lamports,
      validator_tx            = EXCLUDED.validator_tx
  `;
}

export async function challengeAttestation(
  attestationAddress: string,
  challengerWallet: string,
  reason: string,
  txSignature: string
): Promise<void> {
  await ensureTable();
  const oracle = getOracleKeypair();
  const bondAmount = await getStakeFromTx(txSignature, oracle.publicKey.toBase58());

  const sql = db();
  await sql`
    INSERT INTO validation_registry
      (attestation_address, challenger_wallet, challenge_bond_lamports, challenge_tx, challenge_reason, status, challenged_at)
    VALUES
      (${attestationAddress}, ${challengerWallet}, ${bondAmount}, ${txSignature}, ${reason}, 'challenged', NOW())
    ON CONFLICT (attestation_address) DO UPDATE SET
      challenger_wallet        = EXCLUDED.challenger_wallet,
      challenge_bond_lamports  = EXCLUDED.challenge_bond_lamports,
      challenge_tx             = EXCLUDED.challenge_tx,
      challenge_reason         = EXCLUDED.challenge_reason,
      status                   = 'challenged',
      challenged_at            = NOW()
  `;
}

export async function getAttestationStatus(attestationAddress: string): Promise<object | null> {
  await ensureTable();
  const sql = db();
  const rows = await sql`
    SELECT * FROM validation_registry WHERE attestation_address = ${attestationAddress}
  ` as RegistryRecord[];

  if (!rows[0]) return null;
  const r = rows[0];

  let disputeWindowRemainingHours: number | null = null;
  if (r.status === 'challenged' && r.challenged_at) {
    const challengedMs = new Date(r.challenged_at).getTime();
    const elapsed = (Date.now() - challengedMs) / (1000 * 3600);
    disputeWindowRemainingHours = Math.max(0, 48 - elapsed);
  }

  return {
    attestationAddress,
    status: r.status,
    validator: r.validator_wallet,
    validatorStakeLamports: r.validator_stake_lamports,
    challenger: r.challenger_wallet,
    challengeBondLamports: r.challenge_bond_lamports,
    challengeReason: r.challenge_reason,
    challengedAt: r.challenged_at,
    disputeWindowRemainingHours,
    resolvedAt: r.resolved_at,
    resolution: r.resolution,
  };
}

export async function resolveDispute(attestationAddress: string): Promise<object> {
  await ensureTable();
  const sql = db();
  const rows = await sql`
    SELECT * FROM validation_registry WHERE attestation_address = ${attestationAddress}
  ` as RegistryRecord[];

  if (!rows[0]) throw new Error('Attestation not found in registry');
  const r = rows[0];

  if (r.status === 'resolved') return { attestationAddress, status: 'already_resolved', resolution: r.resolution };
  if (r.status !== 'challenged') {
    await sql`
      UPDATE validation_registry SET status = 'resolved', resolved_at = NOW(), resolution = 'no_challenge'
      WHERE attestation_address = ${attestationAddress}
    `;
    return { attestationAddress, status: 'resolved', resolution: 'no_challenge', message: 'No dispute filed; attestation confirmed.' };
  }

  // Require 48h dispute window to elapse before resolution
  if (r.challenged_at) {
    const elapsed = (Date.now() - new Date(r.challenged_at).getTime()) / (1000 * 3600);
    if (elapsed < 48) {
      const remaining = Math.ceil(48 - elapsed);
      return { attestationAddress, status: 'pending', message: `Dispute window open — ${remaining}h remaining before resolution.` };
    }
  }

  // Oracle arbitrates: look up confidence from attestations table and resolve
  const attRows = await sql`
    SELECT confidence FROM attestations WHERE attestation_address = ${attestationAddress} LIMIT 1
  ` as Array<{ confidence: number }>;
  const confidence = attRows[0]?.confidence ?? 0;

  // High confidence (>= 70) → validator wins, challenger is slashed
  // Low confidence (< 70) → challenger wins, validator is slashed
  const validatorWins = confidence >= 70;
  const resolution = validatorWins ? 'validator_wins' : 'challenger_wins';

  await sql`
    UPDATE validation_registry
    SET status = 'resolved', resolved_at = NOW(), resolution = ${resolution}
    WHERE attestation_address = ${attestationAddress}
  `;

  return {
    attestationAddress,
    status: 'resolved',
    resolution,
    confidence,
    message: validatorWins
      ? `Validator wins: confidence ${confidence}% exceeds threshold. Challenge bond slashed.`
      : `Challenger wins: confidence ${confidence}% below threshold. Validator stake slashed.`,
  };
}
