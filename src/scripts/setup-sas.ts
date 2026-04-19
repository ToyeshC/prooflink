import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
} from '@solana/kit';
import {
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
  deriveCredentialPda,
  deriveSchemaPda,
} from 'sas-lib';
import bs58 from 'bs58';

const rpcUrl = process.env.SOLANA_RPC_URL!;
const rpc = createSolanaRpc(rpcUrl);
const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl.replace('https://', 'wss://'));
const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc: rpc as any, rpcSubscriptions });

const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY!.trim());
const signer = await createKeyPairSignerFromBytes(decoded);
console.log('Oracle wallet:', signer.address);

const CREDENTIAL_NAME = 'Proof of Talent';
const SCHEMA_NAME = 'SkillAttestation';

// --- Step 1: Create Credential ---
const [credentialAddress] = await deriveCredentialPda({ authority: signer.address, name: CREDENTIAL_NAME });
console.log('\nDerived Credential PDA:', credentialAddress);

{
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tx = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(
      getCreateCredentialInstruction({
        payer: signer,
        credential: credentialAddress,
        authority: signer,
        name: CREDENTIAL_NAME,
        signers: [signer.address],
      }),
      tx
    )
  );
  const signed = await signTransactionMessageWithSigners(tx);
  await sendAndConfirm(signed, { commitment: 'confirmed' });
  console.log('Credential created:', credentialAddress);
}

// --- Step 2: Create Schema ---
// Layout byte 12 = BorshSchema.String (single "data" field encoded as JSON)
const [schemaAddress] = await deriveSchemaPda({
  credential: credentialAddress,
  name: SCHEMA_NAME,
  version: 1,
});
console.log('\nDerived Schema PDA:', schemaAddress);

{
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tx = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(
      getCreateSchemaInstruction({
        payer: signer,
        authority: signer,
        credential: credentialAddress,
        schema: schemaAddress,
        name: SCHEMA_NAME,
        description: 'Proof of Talent skill attestation — JSON-encoded skill data',
        layout: new Uint8Array([12]), // 12 = String field type
        fieldNames: ['data'],
      }),
      tx
    )
  );
  const signed = await signTransactionMessageWithSigners(tx);
  await sendAndConfirm(signed, { commitment: 'confirmed' });
  console.log('Schema created:', schemaAddress);
}

const config = { credentialAddress, schemaAddress };
fs.writeFileSync(path.join(process.cwd(), 'oracle-config.json'), JSON.stringify(config, null, 2));
console.log('\nSaved oracle-config.json:');
console.log(JSON.stringify(config, null, 2));
