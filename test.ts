import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    type Action,
    executeAction,
    KeypairWallet,
    SolanaAgentKit,
} from 'solana-agent-kit';
import TokenPlugin from '@solana-agent-kit/plugin-token';
import { generateText, stepCountIs, tool, zodSchema, type Tool } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const rpcUrl = process.env.SOLANA_RPC_URL?.trim();
if (!rpcUrl || !/^https?:\/\//i.test(rpcUrl)) {
    throw new Error(
        'Missing or invalid SOLANA_RPC_URL. Set it in my-solana-agent/.env to a full URL, e.g. https://api.devnet.solana.com'
    );
}

let keypair: Keypair;
if (process.env.SOLANA_PRIVATE_KEY) {
    let keyString = process.env.SOLANA_PRIVATE_KEY.trim();
    // remove any surrounding quotes if accidentally included
    keyString = keyString.replace(/^['"](.*)['"]$/, '$1');
    const decodedBytes = bs58.decode(keyString);
    if (decodedBytes.length === 32) {
        keypair = Keypair.fromSeed(decodedBytes);
    } else if (decodedBytes.length === 64) {
        keypair = Keypair.fromSecretKey(decodedBytes);
    } else {
        throw new Error(`Invalid private key length: ${decodedBytes.length} bytes. Expected 32 or 64.`);
    }
} else {
    keypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(path.join(__dirname, 'agent-keypair.json'), 'utf-8')))
    );
}
const wallet = new KeypairWallet(keypair, rpcUrl);

const agent = new SolanaAgentKit(wallet, rpcUrl, {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!
}).use(TokenPlugin);

/**
 * Comma-separated action names, or all for every TokenPlugin tool.
 * Default: only BALANCE_ACTION (smaller request, less quota usage for this script).
 */
function selectActions(all: Action[]): Action[] {
    const raw = process.env.AGENT_ACTION_NAMES?.trim();
    if (raw === 'all' || raw === '*') return all;
    if (!raw) {
        return all.filter((a) => a.name === 'BALANCE_ACTION');
    }
    const allow = new Set(
        raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    );
    return all.filter((a) => allow.has(a.name));
}

/** AI SDK v6 expects inputSchema; solana-agent-kit's createVercelAITools still passes legacy parameters, which becomes an invalid API schema. */
function createVercelToolsForAiSdk6(agent: SolanaAgentKit, actions: Action[]) {
    const out: Record<string, Tool> = {};
    for (const [index, action] of actions.slice(0, 127).entries()) {
        out[index.toString()] = tool({
            description: `
      ${action.description}

      Similes: ${action.similes.map(
                (simile) => `
        ${simile}
      `
            )}

      Examples: ${action.examples.map(
                (example) => `
        Input: ${JSON.stringify(example[0].input)}
        Output: ${JSON.stringify(example[0].output)}
        Explanation: ${example[0].explanation}
      `
            )}
      `.slice(0, 1023),
            inputSchema: zodSchema(action.schema),
            execute: async (params) => executeAction(action, agent, params),
        });
    }
    return out;
}

const actionsForModel = selectActions(agent.actions);
const tools = createVercelToolsForAiSdk6(agent, actionsForModel);

const openRouter = createOpenRouter({
    apiKey: process.env.OPENAI_API_KEY
});

void (async () => {
    const result = await generateText({
        model: openRouter(process.env.OPENAI_MODEL ?? 'openai/gpt-oss-120b:free'),
        tools: tools as unknown as Parameters<typeof generateText>[0]['tools'],
        system: 'You are a Solana agent on devnet.',
        prompt: 'What is my SOL balance?',
        // Fewer steps = fewer billable model calls (balance needs ~2–3 steps).
        stopWhen: stepCountIs(Number(process.env.AGENT_MAX_STEPS) || 3),
    });

    console.log(result.text);
})();