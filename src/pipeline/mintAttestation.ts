import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

type AttestationResult = {
  attestationAddress: string;
  txSignature: string;
  skill: string;
  studentWallet: string;
  confidence: number;
};

function getOracleKeypair(): Keypair {
  const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY!.trim());
  return decoded.length === 32
    ? Keypair.fromSeed(decoded)
    : Keypair.fromSecretKey(decoded);
}

function attestationId(studentWallet: string, skill: string): string {
  return crypto
    .createHash('sha256')
    .update(`${studentWallet}:${skill}:proof-of-talent`)
    .digest('hex')
    .slice(0, 16);
}

export async function mintSkillAttestation(
  studentWalletAddress: string,
  skill: string,
  confidence: number,
  evidenceSummary: string
): Promise<AttestationResult> {
  const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
  const oracleKeypair = getOracleKeypair();

  const id = attestationId(studentWalletAddress, skill);
  const memoPayload = JSON.stringify({
    v: 1,
    type: 'proof-of-talent',
    wallet: studentWalletAddress,
    skill,
    score: Math.round(confidence * 100),
    id,
    evidence: evidenceSummary.slice(0, 120),
  });

  const tx = new Transaction().add(
    new TransactionInstruction({
      keys: [{ pubkey: oracleKeypair.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoPayload, 'utf8'),
    })
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [oracleKeypair]);

  return {
    attestationAddress: id,
    txSignature: sig,
    skill,
    studentWallet: studentWalletAddress,
    confidence,
  };
}

export async function mintAllSkillAttestations(
  studentWalletAddress: string,
  skills: Array<{ slug: string; confidenceScore: number; evidenceSummary: string }>
): Promise<AttestationResult[]> {
  const results: AttestationResult[] = [];
  for (const skill of skills) {
    if (skill.confidenceScore < 0.5) continue;
    console.log(`Minting attestation for ${skill.slug} (${Math.round(skill.confidenceScore * 100)}%)...`);
    const result = await mintSkillAttestation(
      studentWalletAddress,
      skill.slug,
      skill.confidenceScore,
      skill.evidenceSummary
    );
    results.push(result);
  }
  return results;
}
