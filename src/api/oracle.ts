import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { neon } from '@neondatabase/serverless';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fetchGitHubProfile } from '../pipeline/parseGitHub.js';
import { inferSkillsFromExport } from '../pipeline/inferSkills.js';
import { mintAllSkillAttestations } from '../pipeline/mintAttestation.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const ORACLE_CONFIG_PATH = path.join(process.cwd(), 'oracle-config.json');
const LOOKUP_FEE_LAMPORTS = 1667; // ~$0.00025 at $150/SOL

const ORACLE_WALLET = process.env.SOLANA_PRIVATE_KEY
  ? (() => {
      const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY!.trim());
      return decoded.length === 32
        ? Keypair.fromSeed(decoded).publicKey.toBase58()
        : Keypair.fromSecretKey(decoded).publicKey.toBase58();
    })()
  : null;

// ---------------------------------------------------------------------------
// DB helpers (Neon Postgres)
// ---------------------------------------------------------------------------

function db() {
  return neon(process.env.DATABASE_URL!);
}

type AttestationRecord = {
  wallet: string;
  skill: string;
  attestation_address: string;
  tx_signature: string;
  confidence: number;
  evidence: string;
  indexed_at: string;
};

async function upsertAttestation(
  wallet: string,
  skill: string,
  attestationAddress: string,
  txSignature: string,
  confidence: number,
  evidence: string
): Promise<void> {
  const sql = db();
  await sql`
    INSERT INTO attestations
      (wallet, skill, attestation_address, tx_signature, confidence, evidence)
    VALUES
      (${wallet}, ${skill}, ${attestationAddress}, ${txSignature}, ${confidence}, ${evidence})
    ON CONFLICT (wallet, skill) DO UPDATE SET
      attestation_address = EXCLUDED.attestation_address,
      tx_signature        = EXCLUDED.tx_signature,
      confidence          = EXCLUDED.confidence,
      evidence            = EXCLUDED.evidence,
      indexed_at          = NOW()
  `;
}

async function getWalletAttestations(wallet: string): Promise<Record<string, AttestationRecord>> {
  const sql = db();
  const rows = await sql`
    SELECT * FROM attestations WHERE wallet = ${wallet}
  ` as AttestationRecord[];
  return Object.fromEntries(rows.map(r => [r.skill, r]));
}

async function getOneAttestation(wallet: string, skill: string): Promise<AttestationRecord | null> {
  const sql = db();
  const rows = await sql`
    SELECT * FROM attestations WHERE wallet = ${wallet} AND skill = ${skill} LIMIT 1
  ` as AttestationRecord[];
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Payment verification
// ---------------------------------------------------------------------------

async function verifyPaymentProof(txSignature: string): Promise<boolean> {
  if (!process.env.SOLANA_RPC_URL || !ORACLE_WALLET) return false;

  try {
    // 1. Replay protection — check DB for already-used proofs
    const sql = db();
    const existing = await sql`
      SELECT tx_signature FROM used_payment_proofs WHERE tx_signature = ${txSignature}
    `;
    if (existing.length > 0) return false;

    // 2. Fetch transaction
    const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || !tx.meta) return false;

    // 3. Verify the oracle wallet received the expected amount
    const accountKeys = tx.transaction.message.getAccountKeys
      ? tx.transaction.message.getAccountKeys().staticAccountKeys
      : (tx.transaction.message as any).accountKeys;

    const oracleIndex = accountKeys.findIndex(
      (k: { toBase58: () => string } | PublicKey) =>
        (k instanceof PublicKey ? k : new PublicKey(k.toBase58())).toBase58() === ORACLE_WALLET
    );
    if (oracleIndex === -1) return false;

    const received =
      (tx.meta.postBalances[oracleIndex] ?? 0) - (tx.meta.preBalances[oracleIndex] ?? 0);
    if (received < LOOKUP_FEE_LAMPORTS) return false;

    // 4. Mark proof as consumed
    await sql`
      INSERT INTO used_payment_proofs (tx_signature) VALUES (${txSignature})
      ON CONFLICT DO NOTHING
    `;

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export const app = new Hono();

app.use('*', cors());

// Serve index.html for root
app.get('/', c => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  return c.html(html);
});

// Health check
app.get('/health', c => c.json({ status: 'ok', oracle: ORACLE_WALLET }));

// ---------------------------------------------------------------------------
// GitHub-based attestation pipeline
// ---------------------------------------------------------------------------

app.post('/api/analyze-github', async c => {
  let body: { githubUsername: string; studentWallet: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { githubUsername, studentWallet } = body;
  if (!githubUsername) return c.json({ error: 'githubUsername required' }, 400);
  if (!studentWallet) return c.json({ error: 'studentWallet required' }, 400);

  const walletAddress = studentWallet.trim();
  try {
    new PublicKey(walletAddress);
  } catch {
    return c.json({ error: 'studentWallet must be a valid Solana wallet address' }, 400);
  }

  try {
    const exportSummary = await fetchGitHubProfile(githubUsername);
    const inferredSkills = await inferSkillsFromExport(exportSummary);
    const qualifyingSkills = inferredSkills.skills.filter(s => s.confidenceScore >= 0.5);

    const attestations = await mintAllSkillAttestations(
      walletAddress,
      qualifyingSkills.map(s => ({
        slug: s.slug,
        confidenceScore: s.confidenceScore,
        evidenceSummary: s.evidenceSummary,
      }))
    );

    for (const att of attestations) {
      const inferred = qualifyingSkills.find(s => s.slug === att.skill);
      await upsertAttestation(
        walletAddress,
        att.skill,
        att.attestationAddress,
        att.txSignature,
        Math.round(att.confidence * 100),
        inferred?.evidenceSummary ?? ''
      );
    }

    const topSkills = [...inferredSkills.skills]
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 5);

    return c.json({
      success: true,
      githubUsername,
      wallet: walletAddress,
      primaryDomain: inferredSkills.primaryDomain,
      academicLevel: inferredSkills.overallAcademicLevel,
      topSkills: topSkills.map(s => ({
        name: s.name,
        slug: s.slug,
        category: s.category,
        score: Math.round(s.confidenceScore * 100),
        evidence: s.evidenceSummary,
      })),
      attestations: attestations.map(a => ({
        skill: a.skill,
        address: a.attestationAddress,
        txSignature: a.txSignature,
        confidence: Math.round(a.confidence * 100),
        evidence: qualifyingSkills.find(s => s.slug === a.skill)?.evidenceSummary ?? '',
        explorerUrl: `https://explorer.solana.com/tx/${a.txSignature}?cluster=devnet`,
      })),
      attestationCount: attestations.length,
      profileUrl: `/api/profile/${walletAddress}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500);
  }
});

// ---------------------------------------------------------------------------
// Manual attestation submission
// ---------------------------------------------------------------------------

app.post('/api/submit', async c => {
  const body = await c.req.json() as {
    studentWallet: string;
    attestations: Array<{
      skill: string;
      attestationAddress: string;
      txSignature?: string;
      confidence?: number;
      evidence?: string;
    }>;
  };

  for (const attestation of body.attestations) {
    await upsertAttestation(
      body.studentWallet,
      attestation.skill,
      attestation.attestationAddress,
      attestation.txSignature ?? '',
      attestation.confidence ?? 0,
      attestation.evidence ?? ''
    );
  }

  return c.json({
    indexed: body.attestations.length,
    message: 'Attestations indexed.',
  });
});

// ---------------------------------------------------------------------------
// Skill verification — gated by x402 micropayment
// ---------------------------------------------------------------------------

app.get('/api/verify', async c => {
  const walletParam = c.req.query('wallet');
  const skill = c.req.query('skill');
  const paymentProof = c.req.header('X-Payment-Proof');

  if (!walletParam || !skill) {
    return c.json({ error: 'wallet and skill query params required' }, 400);
  }

  if (!paymentProof) {
    return c.json({
      error: 'Payment Required',
      payment: {
        protocol: 'x402',
        version: '1.0',
        amount: LOOKUP_FEE_LAMPORTS,
        token: 'SOL',
        recipient: ORACLE_WALLET,
        network: 'solana-devnet',
        description: `Verified skill lookup: ${skill} for ${walletParam}`,
        callbackUrl: c.req.url,
      },
      instructions: `Send ${LOOKUP_FEE_LAMPORTS} lamports to ${ORACLE_WALLET} and include the tx signature in X-Payment-Proof header`,
    }, 402);
  }

  const paymentValid = await verifyPaymentProof(paymentProof);
  if (!paymentValid) {
    return c.json({ error: 'Invalid, insufficient, or already-used payment proof' }, 402);
  }

  const record = await getOneAttestation(walletParam, skill);
  if (!record) {
    return c.json({
      verified: false,
      wallet: walletParam,
      skill,
      message: 'No attestation found for this wallet + skill combination.',
    });
  }

  return c.json({
    verified: true,
    wallet: walletParam,
    skill,
    attestation: {
      address: record.attestation_address,
      txSignature: record.tx_signature,
      confidence: record.confidence,
      evidence: record.evidence,
      indexedAt: record.indexed_at,
      verifyTxUrl: record.tx_signature
        ? `https://explorer.solana.com/tx/${record.tx_signature}?cluster=devnet`
        : null,
    },
  });
});

// ---------------------------------------------------------------------------
// Student profile — all attested skills for a wallet (free)
// ---------------------------------------------------------------------------

app.get('/api/profile/:wallet', async c => {
  const wallet = c.req.param('wallet');
  const skills = await getWalletAttestations(wallet);
  return c.json({
    wallet,
    attestedSkills: Object.keys(skills),
    attestations: skills,
    attestationCount: Object.keys(skills).length,
    lookupEndpoint: `/api/verify?wallet=${wallet}&skill=<skill-slug>`,
  });
});

// ---------------------------------------------------------------------------
// Oracle info
// ---------------------------------------------------------------------------

app.get('/api/oracle-info', c => {
  const config = fs.existsSync(ORACLE_CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(ORACLE_CONFIG_PATH, 'utf8'))
    : null;

  return c.json({
    oracle: ORACLE_WALLET,
    sasProgram: 'FJ8myMh9dRcgc2n8xBrWTbCrFYAbHQZCPtMzhhmvNo4M',
    credential: config?.credentialAddress ?? null,
    schema: config?.schemaAddress ?? null,
    lookupFeeSOL: LOOKUP_FEE_LAMPORTS / 1_000_000_000,
    network: process.env.SOLANA_RPC_URL?.includes('devnet') ? 'devnet' : 'mainnet',
    businessModel: {
      tier1_student: 'First attestation free, $8/year refresh',
      tier2_recruiter: '$29-99/month subscription',
      tier3_machine: `x402 micropayment: ${LOOKUP_FEE_LAMPORTS} lamports per lookup (~$0.00025)`,
    },
  });
});

// ---------------------------------------------------------------------------
// Server entry point
// ---------------------------------------------------------------------------

export function startOracleServer(port = 3000) {
  serve({ fetch: app.fetch, port }, info => {
    console.log(`Proof of Talent Oracle running on http://localhost:${info.port}`);
    console.log(`Oracle wallet: ${ORACLE_WALLET}`);
    console.log(`x402 lookup endpoint: GET /api/verify?wallet=<address>&skill=<slug>`);
  });
}

if (process.argv[1]?.includes('oracle')) {
  startOracleServer();
}
