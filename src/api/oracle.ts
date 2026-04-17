import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { createSolanaRpc } from '@solana/kit';
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fetchGitHubProfile } from '../pipeline/parseGitHub.js';
import { inferSkillsFromExport } from '../pipeline/inferSkills.js';
import { mintAllSkillAttestations } from '../pipeline/mintAttestation.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const ORACLE_CONFIG_PATH = path.join(process.cwd(), 'oracle-config.json');
const LOOKUP_FEE_LAMPORTS = 25; // ~$0.00025 at $10/SOL, adjustable
const ORACLE_WALLET = process.env.SOLANA_PRIVATE_KEY
  ? (() => {
      const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY!.trim());
      return decoded.length === 32
        ? Keypair.fromSeed(decoded).publicKey.toBase58()
        : Keypair.fromSecretKey(decoded).publicKey.toBase58();
    })()
  : null;

type IndexedAttestation = {
  attestationAddress: string;
  txSignature: string;
  confidence: number;
  evidence: string;
  indexedAt: string;
};

// In-memory attestation index: wallet -> skill -> attestation details
type AttestationIndex = Record<string, Record<string, IndexedAttestation>>;
let attestationIndex: AttestationIndex = {};

const ATTESTATION_DB_PATH = path.join(process.cwd(), 'attestation-index.json');

function loadAttestationIndex() {
  if (fs.existsSync(ATTESTATION_DB_PATH)) {
    const raw = JSON.parse(fs.readFileSync(ATTESTATION_DB_PATH, 'utf8'));
    attestationIndex = normalizeAttestationIndex(raw);
  }
}

export function indexAttestation(studentWallet: string, skill: string, attestationAddress: string) {
  if (!attestationIndex[studentWallet]) attestationIndex[studentWallet] = {};
  attestationIndex[studentWallet][skill] = {
    attestationAddress,
    txSignature: '',
    confidence: 0,
    evidence: '',
    indexedAt: new Date().toISOString(),
  };
  fs.writeFileSync(ATTESTATION_DB_PATH, JSON.stringify(attestationIndex, null, 2));
}

function indexAttestationRecord(studentWallet: string, skill: string, record: IndexedAttestation) {
  if (!attestationIndex[studentWallet]) attestationIndex[studentWallet] = {};
  attestationIndex[studentWallet][skill] = record;
  fs.writeFileSync(ATTESTATION_DB_PATH, JSON.stringify(attestationIndex, null, 2));
}

function normalizeAttestationIndex(raw: unknown): AttestationIndex {
  const normalized: AttestationIndex = {};
  if (!raw || typeof raw !== 'object') return normalized;

  for (const [wallet, maybeSkills] of Object.entries(raw as Record<string, unknown>)) {
    if (!maybeSkills || typeof maybeSkills !== 'object') continue;
    normalized[wallet] = {};
    for (const [skill, value] of Object.entries(maybeSkills as Record<string, unknown>)) {
      if (typeof value === 'string') {
        normalized[wallet][skill] = {
          attestationAddress: value,
          txSignature: '',
          confidence: 0,
          evidence: '',
          indexedAt: new Date().toISOString(),
        };
      } else if (value && typeof value === 'object') {
        const record = value as Partial<IndexedAttestation>;
        if (typeof record.attestationAddress !== 'string') continue;
        normalized[wallet][skill] = {
          attestationAddress: record.attestationAddress,
          txSignature: typeof record.txSignature === 'string' ? record.txSignature : '',
          confidence: typeof record.confidence === 'number' ? record.confidence : 0,
          evidence: typeof record.evidence === 'string' ? record.evidence : '',
          indexedAt: typeof record.indexedAt === 'string' ? record.indexedAt : new Date().toISOString(),
        };
      }
    }
  }

  return normalized;
}

const app = new Hono();

app.use('*', cors());

// Serve index.html for root
app.get('/', c => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  return c.html(html);
});

// Health check
app.get('/health', c => c.json({ status: 'ok', oracle: ORACLE_WALLET }));

// GitHub-based attestation pipeline — the main demo endpoint
app.post('/api/analyze-github', async c => {
  let body: { githubUsername: string; studentWallet?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { githubUsername, studentWallet } = body;
  if (!githubUsername) return c.json({ error: 'githubUsername required' }, 400);

  const walletAddress = studentWallet ?? Keypair.generate().publicKey.toBase58();

  try {
    // Step 1: Fetch GitHub profile
    const exportSummary = await fetchGitHubProfile(githubUsername);

    // Step 2: LLM skill inference
    const inferredSkills = await inferSkillsFromExport(exportSummary);
    const qualifyingSkills = inferredSkills.skills.filter(s => s.confidenceScore >= 0.5);

    // Step 3: Mint SAS attestations on devnet
    const attestations = await mintAllSkillAttestations(
      walletAddress,
      qualifyingSkills.map(s => ({
        slug: s.slug,
        confidenceScore: s.confidenceScore,
        evidenceSummary: s.evidenceSummary,
      }))
    );

    // Step 4: Index
    for (const att of attestations) {
      const inferred = qualifyingSkills.find(s => s.slug === att.skill);
      indexAttestationRecord(walletAddress, att.skill, {
        attestationAddress: att.attestationAddress,
        txSignature: att.txSignature,
        confidence: Math.round(att.confidence * 100),
        evidence: inferred?.evidenceSummary ?? '',
        indexedAt: new Date().toISOString(),
      });
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

// Attestation submission (called after minting pipeline completes)
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
    indexAttestationRecord(body.studentWallet, attestation.skill, {
      attestationAddress: attestation.attestationAddress,
      txSignature: attestation.txSignature ?? '',
      confidence: attestation.confidence ?? 0,
      evidence: attestation.evidence ?? '',
      indexedAt: new Date().toISOString(),
    });
  }

  return c.json({
    indexed: body.attestations.length,
    message: 'Attestations indexed. Students can share their wallet for recruiter verification.',
  });
});

// Skill verification lookup — gated by x402 micropayment
// Returns 402 if no payment proof, 200 with attestation if payment verified
app.get('/api/verify', async c => {
  const walletParam = c.req.query('wallet');
  const skill = c.req.query('skill');
  const paymentProof = c.req.header('X-Payment-Proof');

  if (!walletParam || !skill) {
    return c.json({ error: 'wallet and skill query params required' }, 400);
  }

  // x402: return payment instructions if no proof provided
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
        callbackUrl: `${c.req.url}`,
      },
      instructions: `Send ${LOOKUP_FEE_LAMPORTS} lamports to ${ORACLE_WALLET} and include tx signature in X-Payment-Proof header`,
    }, 402);
  }

  // Verify payment proof (simplified: check the tx exists on-chain)
  const paymentValid = await verifyPaymentProof(paymentProof);
  if (!paymentValid) {
    return c.json({ error: 'Invalid or expired payment proof' }, 402);
  }

  // Look up attestation
  const record = attestationIndex[walletParam]?.[skill];
  if (!record) {
    return c.json({
      verified: false,
      wallet: walletParam,
      skill,
      message: 'No attestation found. Student has not submitted Canvas data for this skill.',
    });
  }

  return c.json({
    verified: true,
    wallet: walletParam,
    skill,
    attestation: {
      address: record.attestationAddress,
      txSignature: record.txSignature,
      confidence: record.confidence,
      evidence: record.evidence,
      indexedAt: record.indexedAt,
      verifyTxUrl: record.txSignature
        ? `https://explorer.solana.com/tx/${record.txSignature}?cluster=devnet`
        : null,
    },
  });
});

// Student profile: all attested skills for a wallet (free endpoint)
app.get('/api/profile/:wallet', c => {
  const wallet = c.req.param('wallet');
  const skills = attestationIndex[wallet] ?? {};
  return c.json({
    wallet,
    attestedSkills: Object.keys(skills),
    attestations: skills,
    attestationCount: Object.keys(skills).length,
    lookupEndpoint: `/api/verify?wallet=${wallet}&skill=<skill-slug>`,
  });
});

// Oracle info (for x402 payment negotiation)
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
      tier2_recruiter: '$29-99/month subscription (see /api/subscribe)',
      tier3_machine: `x402 micropayment: ${LOOKUP_FEE_LAMPORTS} lamports per lookup`,
    },
  });
});

async function verifyPaymentProof(txSignature: string): Promise<boolean> {
  try {
    const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);
    // @ts-ignore — getTransaction is available but typed differently in kit v2
    const tx = await rpc.getTransaction(txSignature, { commitment: 'confirmed' }).send();
    return tx !== null;
  } catch {
    return false;
  }
}

export function startOracleServer(port = 3000) {
  loadAttestationIndex();
  serve({ fetch: app.fetch, port }, info => {
    console.log(`Proof of Talent Oracle running on http://localhost:${info.port}`);
    console.log(`Oracle wallet: ${ORACLE_WALLET}`);
    console.log(`x402 lookup endpoint: GET /api/verify?wallet=<address>&skill=<slug>`);
  });
}

// Run directly
if (process.argv[1]?.includes('oracle')) {
  startOracleServer();
}
