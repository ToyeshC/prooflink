import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { neon } from '@neondatabase/serverless';
import bs58 from 'bs58';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fetchGitHubProfile } from '../pipeline/parseGitHub.js';
import { inferSkillsFromExport } from '../pipeline/inferSkills.js';
import { mintAllSkillAttestations } from '../pipeline/mintAttestation.js';
import { parseCanvasExport, summarizeExport } from '../pipeline/parseCanvas.js';
import {
  registerValidator,
  challengeAttestation,
  getAttestationStatus,
  resolveDispute,
  getAllValidators,
} from '../validation-registry/index.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const ORACLE_CONFIG_PATH = path.join(process.cwd(), 'oracle-config.json');
const LOOKUP_FEE_LAMPORTS = 1667; // kept for reference; actual fee is USDC
const USDC_DEVNET_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; // Circle devnet USDC (faucet.circle.com)
const LOOKUP_FEE_USDC_RAW = 250; // 0.000250 USDC (6 decimals) ≈ $0.00025
const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOC_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1caR');

const ORACLE_WALLET = process.env.SOLANA_PRIVATE_KEY
  ? (() => {
      const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY!.trim());
      return decoded.length === 32
        ? Keypair.fromSeed(decoded).publicKey.toBase58()
        : Keypair.fromSecretKey(decoded).publicKey.toBase58();
    })()
  : null;

function getOracleUsdcAta(): string | null {
  if (!ORACLE_WALLET) return null;
  const [ata] = PublicKey.findProgramAddressSync(
    [
      new PublicKey(ORACLE_WALLET).toBuffer(),
      SPL_TOKEN_PROGRAM_ID.toBuffer(),
      new PublicKey(USDC_DEVNET_MINT).toBuffer(),
    ],
    ASSOC_TOKEN_PROGRAM_ID
  );
  return ata.toBase58();
}

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

export async function upsertAttestation(
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

async function incrementProfileViews(wallet: string): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  try {
    const sql = db();
    await sql`
      CREATE TABLE IF NOT EXISTS profile_views (
        wallet TEXT PRIMARY KEY,
        view_count INTEGER NOT NULL DEFAULT 0,
        last_viewed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    const rows = await sql`
      INSERT INTO profile_views (wallet, view_count, last_viewed_at)
      VALUES (${wallet}, 1, NOW())
      ON CONFLICT (wallet) DO UPDATE
        SET view_count = profile_views.view_count + 1,
            last_viewed_at = NOW()
      RETURNING view_count
    ` as { view_count: number }[];
    return rows[0]?.view_count ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Payment verification
// ---------------------------------------------------------------------------

async function verifyPaymentProof(txSignature: string): Promise<boolean> {
  if (!process.env.SOLANA_RPC_URL || !ORACLE_WALLET) return false;

  try {
    // 1. Replay protection
    const sql = db();
    const existing = await sql`
      SELECT tx_signature FROM used_payment_proofs WHERE tx_signature = ${txSignature}
    `;
    if (existing.length > 0) return false;

    // 2. Fetch transaction with token balance snapshots
    const connection = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || !tx.meta) return false;

    // 3. Check USDC SPL token transfer to oracle wallet's ATA
    const pre = tx.meta.preTokenBalances ?? [];
    const post = tx.meta.postTokenBalances ?? [];

    const oraclePost = post.find(b => b.owner === ORACLE_WALLET && b.mint === USDC_DEVNET_MINT);
    if (!oraclePost) return false;

    const oraclePre = pre.find(b => b.owner === ORACLE_WALLET && b.mint === USDC_DEVNET_MINT);
    const postAmt = BigInt(oraclePost.uiTokenAmount.amount);
    const preAmt = oraclePre ? BigInt(oraclePre.uiTokenAmount.amount) : 0n;
    if (postAmt - preAmt < BigInt(LOOKUP_FEE_USDC_RAW)) return false;

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
// Skill deduplication — keeps highest-confidence skill when slugs overlap
// (e.g. "python" and "python-programming" → keep the higher confidence one)
// ---------------------------------------------------------------------------

function deduplicateSkills<T extends { slug: string; confidenceScore: number }>(skills: T[]): T[] {
  const sorted = [...skills].sort((a, b) => b.confidenceScore - a.confidenceScore);
  const kept: T[] = [];
  for (const skill of sorted) {
    const isDuplicate = kept.some(k => {
      if (k.slug === skill.slug) return true;
      const [shorter, longer] = k.slug.length <= skill.slug.length
        ? [k.slug, skill.slug]
        : [skill.slug, k.slug];
      return longer.startsWith(shorter + '-');
    });
    if (!isDuplicate) kept.push(skill);
  }
  return kept;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export const app = new Hono();

app.use('*', cors());
app.onError((err, c) => c.json({ error: err.message }, 500));

// Serve index.html for root
app.get('/', c => {
  c.header('Link', '</.well-known/mcp/server-card.json>; rel="mcp-server-card"');
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  return c.html(html);
});

// Shareable skill passport page
app.get('/profile/:wallet', c => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'profile.html'), 'utf8');
  return c.html(html);
});

// Static well-known files for agent discoverability
app.get('/robots.txt', c => {
  const txt = fs.readFileSync(path.join(process.cwd(), 'public', 'robots.txt'), 'utf8');
  return c.text(txt, 200, { 'Content-Type': 'text/plain' });
});

app.get('/.well-known/mcp/server-card.json', c => {
  const json = fs.readFileSync(
    path.join(process.cwd(), 'public', '.well-known', 'mcp', 'server-card.json'),
    'utf8'
  );
  return c.text(json, 200, { 'Content-Type': 'application/json' });
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
    const dedupedSkills = deduplicateSkills(inferredSkills.skills);
    const qualifyingSkills = dedupedSkills.filter(s => s.confidenceScore >= 0.5);

    const attestations = await mintAllSkillAttestations(
      walletAddress,
      qualifyingSkills.map(s => ({
        slug: s.slug,
        confidenceScore: s.confidenceScore,
        evidenceSummary: s.evidenceSummary,
      }))
    );

    // Clean slate: delete stale attestations before upserting fresh ones
    const sql2 = db();
    await sql2`DELETE FROM attestations WHERE wallet = ${walletAddress}`;

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
      modelUsed: process.env.ANTHROPIC_API_KEY ? 'claude-sonnet-4-6' : (process.env.INFERENCE_MODEL ?? 'unknown'),
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
// Canvas ZIP-based attestation pipeline
// ---------------------------------------------------------------------------

app.post('/api/analyze-canvas', async c => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'Expected multipart/form-data with canvasZip and studentWallet fields' }, 400);
  }

  const zipFile = formData.get('canvasZip') as File | null;
  const studentWallet = (formData.get('studentWallet') as string | null)?.trim();

  if (!zipFile) return c.json({ error: 'canvasZip file required' }, 400);
  if (!studentWallet) return c.json({ error: 'studentWallet required' }, 400);

  try {
    new PublicKey(studentWallet);
  } catch {
    return c.json({ error: 'studentWallet must be a valid Solana wallet address' }, 400);
  }

  const tmpPath = path.join(os.tmpdir(), `canvas-${crypto.randomUUID()}.zip`);
  try {
    const arrayBuffer = await zipFile.arrayBuffer();
    fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));

    const parsed = parseCanvasExport(tmpPath);
    const exportSummary = summarizeExport(parsed);
    const inferredSkills = await inferSkillsFromExport(exportSummary);
    const dedupedSkills = deduplicateSkills(inferredSkills.skills);
    const qualifyingSkills = dedupedSkills.filter(s => s.confidenceScore >= 0.5);

    const attestations = await mintAllSkillAttestations(
      studentWallet,
      qualifyingSkills.map(s => ({
        slug: s.slug,
        confidenceScore: s.confidenceScore,
        evidenceSummary: s.evidenceSummary,
      }))
    );

    // Clean slate: delete stale attestations before upserting fresh ones
    const sql2 = db();
    await sql2`DELETE FROM attestations WHERE wallet = ${studentWallet}`;

    for (const att of attestations) {
      const inferred = qualifyingSkills.find(s => s.slug === att.skill);
      await upsertAttestation(
        studentWallet,
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
      source: 'canvas',
      courseNames: parsed.courseNames,
      wallet: studentWallet,
      modelUsed: process.env.ANTHROPIC_API_KEY ? 'claude-sonnet-4-6' : (process.env.INFERENCE_MODEL ?? 'unknown'),
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
      profileUrl: `/api/profile/${studentWallet}`,
    });
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
});

// ---------------------------------------------------------------------------
// Validation Registry endpoints
// ---------------------------------------------------------------------------

app.post('/api/registry/register', async c => {
  let body: { attestationAddress: string; validatorWallet: string; txSignature: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const { attestationAddress, validatorWallet, txSignature } = body;
  if (!attestationAddress || !validatorWallet || !txSignature) {
    return c.json({ error: 'attestationAddress, validatorWallet, txSignature required' }, 400);
  }
  try {
    await registerValidator(attestationAddress, validatorWallet, txSignature);
    return c.json({ success: true, attestationAddress, validatorWallet, status: 'registered' });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

app.post('/api/registry/challenge', async c => {
  let body: { attestationAddress: string; challengerWallet: string; reason: string; txSignature: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const { attestationAddress, challengerWallet, reason, txSignature } = body;
  if (!attestationAddress || !challengerWallet || !txSignature) {
    return c.json({ error: 'attestationAddress, challengerWallet, txSignature required' }, 400);
  }
  try {
    await challengeAttestation(attestationAddress, challengerWallet, reason ?? '', txSignature);
    return c.json({ success: true, attestationAddress, status: 'challenged', disputeWindowHours: 48 });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

app.get('/api/registry/status/:attestation', async c => {
  const attestationAddress = c.req.param('attestation');
  try {
    const status = await getAttestationStatus(attestationAddress);
    if (!status) return c.json({ attestationAddress, status: 'unregistered' });
    return c.json(status);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

app.get('/api/registry/list', async c => {
  try {
    const validators = await getAllValidators();
    return c.json({ validators });
  } catch {
    return c.json({ validators: [] });
  }
});

app.post('/api/registry/resolve', async c => {
  let body: { attestationAddress: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  if (!body.attestationAddress) return c.json({ error: 'attestationAddress required' }, 400);
  try {
    const result = await resolveDispute(body.attestationAddress);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
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
    const oracleAta = getOracleUsdcAta();
    return c.json({
      error: 'Payment Required',
      payment: {
        protocol: 'x402',
        version: '1.0',
        amount: LOOKUP_FEE_USDC_RAW,
        humanAmount: `${(LOOKUP_FEE_USDC_RAW / 1_000_000).toFixed(6)} USDC`,
        token: 'USDC',
        mint: USDC_DEVNET_MINT,
        recipient: oracleAta,
        recipientOwner: ORACLE_WALLET,
        decimals: 6,
        network: 'solana-devnet',
        description: `Verified skill lookup: ${skill} for ${walletParam}`,
        callbackUrl: c.req.url,
      },
      instructions: `Send ${LOOKUP_FEE_USDC_RAW} raw USDC (${(LOOKUP_FEE_USDC_RAW / 1_000_000).toFixed(6)} USDC) to token account ${oracleAta} on devnet and include the tx signature in X-Payment-Proof header`,
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
  const [skills, queryCount] = await Promise.all([
    getWalletAttestations(wallet),
    incrementProfileViews(wallet),
  ]);
  const acceptsMarkdown = c.req.header('accept')?.includes('text/markdown');

  if (acceptsMarkdown) {
    const entries = Object.values(skills);
    const lines = [
      `# Prooflink Profile`,
      `**Wallet:** ${wallet}`,
      `**Attested skills:** ${entries.length}`,
      `**Profile queries:** ${queryCount}`,
      '',
      ...entries.map(a =>
        `## ${a.skill} — ${a.confidence}%\n${a.evidence}\nAttestation: ${a.attestation_address}`
      ),
    ];
    return c.text(lines.join('\n\n'), 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
  }

  return c.json({
    wallet,
    attestedSkills: Object.keys(skills),
    attestations: skills,
    attestationCount: Object.keys(skills).length,
    queryCount,
    lookupEndpoint: `/api/verify?wallet=${wallet}&skill=<skill-slug>`,
  });
});

// ---------------------------------------------------------------------------
// Oracle info
// ---------------------------------------------------------------------------

app.get('/api/oracle-info', c => {
  const fileConfig = fs.existsSync(ORACLE_CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(ORACLE_CONFIG_PATH, 'utf8'))
    : null;
  const credentialAddress = process.env.ORACLE_CREDENTIAL_ADDRESS ?? fileConfig?.credentialAddress ?? null;
  const schemaAddress = process.env.ORACLE_SCHEMA_ADDRESS ?? fileConfig?.schemaAddress ?? null;

  return c.json({
    oracle: ORACLE_WALLET,
    sasProgram: 'FJ8myMh9dRcgc2n8xBrWTbCrFYAbHQZCPtMzhhmvNo4M',
    credential: credentialAddress,
    schema: schemaAddress,
    network: process.env.SOLANA_RPC_URL?.includes('devnet') ? 'devnet' : 'mainnet',
    payment: {
      protocol: 'x402',
      token: 'USDC',
      mint: USDC_DEVNET_MINT,
      oracleTokenAccount: getOracleUsdcAta(),
      feeRaw: LOOKUP_FEE_USDC_RAW,
      feeHuman: `${(LOOKUP_FEE_USDC_RAW / 1_000_000).toFixed(6)} USDC`,
    },
    businessModel: {
      tier1_student: 'First attestation free, $8/year refresh',
      tier2_recruiter: '$29-99/month subscription',
      tier3_machine: `x402 micropayment: ${LOOKUP_FEE_USDC_RAW} raw USDC per lookup (~$0.00025)`,
    },
  });
});

// ---------------------------------------------------------------------------
// Server entry point
// ---------------------------------------------------------------------------

export function startOracleServer(port = 3000) {
  serve({ fetch: app.fetch, port }, info => {
    console.log(`Prooflink Oracle running on http://localhost:${info.port}`);
    console.log(`Oracle wallet: ${ORACLE_WALLET}`);
    console.log(`x402 lookup endpoint: GET /api/verify?wallet=<address>&skill=<slug>`);
  });
}

if (process.argv[1]?.includes('oracle')) {
  startOracleServer();
}
