import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import {
  createSolanaRpc, createSolanaRpcSubscriptions, createKeyPairSignerFromBytes,
  generateKeyPairSigner, pipe, createTransactionMessage, setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstruction,
  signTransactionMessageWithSigners, sendAndConfirmTransactionFactory,
} from '@solana/kit';
import { getCreateCredentialInstruction } from '@dankelleher/solana-attestation-service-client';
import bs58 from 'bs58';

const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL!);
const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY!.trim());
const signer = await createKeyPairSignerFromBytes(decoded);
console.log('Signer:', signer.address);

const rpcWs = process.env.SOLANA_RPC_URL!.replace('https://', 'wss://');
const rpcSubscriptions = createSolanaRpcSubscriptions(rpcWs);
const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc: rpc as any, rpcSubscriptions });

const credentialSigner = await generateKeyPairSigner();
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

try {
  const tx = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(signer, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstruction(
      getCreateCredentialInstruction({
        payer: signer,
        credential: credentialSigner.address,
        authority: signer,
        name: 'Test Credential',
        signers: [signer.address],
      }),
      tx
    )
  );
  const signed = await signTransactionMessageWithSigners(tx);
  await sendAndConfirm(signed, { commitment: 'confirmed' });
  console.log('SUCCESS! Credential:', credentialSigner.address);
} catch (err: any) {
  console.error('Error msg:', err.message);
  if (err.cause) console.error('Cause:', JSON.stringify(err.cause, null, 2));
  else console.error('Full err:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
}
