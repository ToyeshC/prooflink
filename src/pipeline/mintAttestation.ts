import {
  createSolanaRpc,
  createKeyPairSignerFromBytes,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  address as toAddress,
} from '@solana/kit';
import { getCreateAttestationInstruction, deriveAttestationPda } from 'sas-lib';
import { BorshSchema } from 'borsher';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';

type OracleConfig = { credentialAddress: string; schemaAddress: string };

function loadOracleConfig(): OracleConfig {
  if (process.env.ORACLE_CREDENTIAL_ADDRESS && process.env.ORACLE_SCHEMA_ADDRESS) {
    return {
      credentialAddress: process.env.ORACLE_CREDENTIAL_ADDRESS,
      schemaAddress: process.env.ORACLE_SCHEMA_ADDRESS,
    };
  }
  const configPath = path.join(process.cwd(), 'oracle-config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as OracleConfig;
}

// Schema: single "data" string field containing JSON-encoded skill payload
const DATA_SCHEMA = BorshSchema.Struct({ data: BorshSchema.String });

type AttestationResult = {
  attestationAddress: string;
  txSignature: string;
  skill: string;
  studentWallet: string;
  confidence: number;
};

export async function mintSkillAttestation(
  studentWalletAddress: string,
  skill: string,
  confidence: number,
  evidenceSummary: string
): Promise<AttestationResult> {
  const config = loadOracleConfig();
  const rpcUrl = process.env.SOLANA_RPC_URL!;
  const rpc = createSolanaRpc(rpcUrl);

  const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY!.trim());
  const oracleSigner = await createKeyPairSignerFromBytes(decoded);

  // Unique nonce per attestation prevents PDA collisions for multi-skill students
  const nonceSigner = await generateKeyPairSigner();
  const credentialAddr = toAddress(config.credentialAddress);
  const schemaAddr = toAddress(config.schemaAddress);

  const [attestationAddress] = await deriveAttestationPda({
    credential: credentialAddr,
    schema: schemaAddr,
    nonce: nonceSigner.address,
  });

  const skillPayload = JSON.stringify({
    wallet: studentWalletAddress,
    skill,
    score: Math.round(confidence * 100),
    evidence: evidenceSummary.slice(0, 200),
  });
  const dataBytes = DATA_SCHEMA.serialize({ data: skillPayload });
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(oracleSigner, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(
      getCreateAttestationInstruction({
        payer: oracleSigner,
        authority: oracleSigner,
        credential: credentialAddr,
        schema: schemaAddr,
        attestation: attestationAddress,
        nonce: nonceSigner.address,
        data: dataBytes,
        expiry,
      }),
      tx
    )
  );

  const signed = await signTransactionMessageWithSigners(txMessage);
  const txSignature = getSignatureFromTransaction(signed);

  // Send via HTTP (no WebSocket — public devnet WSS is unreliable)
  const encoded = getBase64EncodedWireTransaction(signed);
  await (rpc as any).sendTransaction(encoded, { encoding: 'base64', skipPreflight: false }).send();

  // Poll for confirmation (up to 20s — keeps us within Vercel 60s budget)
  let confirmed = false;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const { value: statuses } = await (rpc as any).getSignatureStatuses([txSignature]).send();
    const s = statuses[0]?.confirmationStatus;
    if (s === 'confirmed' || s === 'finalized') { confirmed = true; break; }
  }
  if (!confirmed) throw new Error(`Attestation tx not confirmed after 60s: ${txSignature}`);

  return {
    attestationAddress: attestationAddress as string,
    txSignature: txSignature as string,
    skill,
    studentWallet: studentWalletAddress,
    confidence,
  };
}

export async function mintAllSkillAttestations(
  studentWalletAddress: string,
  skills: Array<{ slug: string; confidenceScore: number; evidenceSummary: string }>
): Promise<AttestationResult[]> {
  const qualifying = skills.filter(s => s.confidenceScore >= 0.5);
  qualifying.forEach(s =>
    console.log(`Minting SAS attestation for ${s.slug} (${Math.round(s.confidenceScore * 100)}%)...`)
  );
  const settled = await Promise.allSettled(
    qualifying.map(skill =>
      mintSkillAttestation(studentWalletAddress, skill.slug, skill.confidenceScore, skill.evidenceSummary)
    )
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<AttestationResult> => r.status === 'fulfilled')
    .map(r => r.value);
}
