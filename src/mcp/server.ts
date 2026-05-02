import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_URL =
  process.env.PROOFLINK_API_URL ?? 'https://proof-of-talent-silk.vercel.app';

const server = new Server(
  { name: 'prooflink-oracle', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_profile',
      description:
        'Get all on-chain skill attestations for a Solana wallet address. Returns verified skills with confidence scores and evidence summaries.',
      inputSchema: {
        type: 'object',
        properties: {
          wallet: {
            type: 'string',
            description: 'Solana wallet address (base58)',
          },
        },
        required: ['wallet'],
      },
    },
    {
      name: 'verify_skill',
      description:
        'Check if a specific skill is attested on-chain for a wallet. Returns verification status, confidence score, and evidence.',
      inputSchema: {
        type: 'object',
        properties: {
          wallet: {
            type: 'string',
            description: 'Solana wallet address (base58)',
          },
          skill: {
            type: 'string',
            description: 'Skill slug to verify, e.g. "react", "rust", "solidity"',
          },
        },
        required: ['wallet', 'skill'],
      },
    },
    {
      name: 'analyze_github',
      description:
        'Ingest a GitHub profile and mint on-chain skill attestations via Solana Attestation Service. Returns the list of attested skills.',
      inputSchema: {
        type: 'object',
        properties: {
          githubUsername: {
            type: 'string',
            description: 'GitHub username to analyze',
          },
          wallet: {
            type: 'string',
            description: 'Solana wallet address to mint attestations to (base58)',
          },
        },
        required: ['githubUsername', 'wallet'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'get_profile') {
      const { wallet } = args as { wallet: string };
      const res = await fetch(`${API_URL}/api/profile/${encodeURIComponent(wallet)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const err = await res.text();
        return { content: [{ type: 'text', text: `Error fetching profile: ${err}` }], isError: true };
      }
      const data = await res.json();
      if (!data.attestations || data.attestations.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No attested skills found for wallet ${wallet}. Use analyze_github to mint attestations.`,
            },
          ],
        };
      }
      const lines = [
        `**Prooflink Profile — ${wallet.slice(0, 8)}...${wallet.slice(-4)}**`,
        '',
        ...data.attestations.map(
          (a: { skill: string; confidence: number; evidence: string; attestationAddress: string }) =>
            `- **${a.skill}** — ${a.confidence}% confidence\n  ${a.evidence}\n  Attestation: ${a.attestationAddress}`
        ),
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    if (name === 'verify_skill') {
      const { wallet, skill } = args as { wallet: string; skill: string };
      // Check free profile first to avoid payment requirement in MCP context
      const res = await fetch(`${API_URL}/api/profile/${encodeURIComponent(wallet)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return { content: [{ type: 'text', text: `Error fetching profile` }], isError: true };
      }
      const data = await res.json();
      const match = data.attestations?.find(
        (a: { skill: string }) => a.skill.toLowerCase() === skill.toLowerCase()
      );
      if (!match) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Skill "${skill}" is NOT attested on-chain for wallet ${wallet.slice(0, 8)}...${wallet.slice(-4)}.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: [
              `✅ Skill "${match.skill}" is VERIFIED on-chain`,
              `Confidence: ${match.confidence}%`,
              `Evidence: ${match.evidence}`,
              `Attestation: ${match.attestationAddress}`,
              `Explorer: https://explorer.solana.com/address/${match.attestationAddress}?cluster=devnet`,
            ].join('\n'),
          },
        ],
      };
    }

    if (name === 'analyze_github') {
      const { githubUsername, wallet } = args as { githubUsername: string; wallet: string };
      const res = await fetch(`${API_URL}/api/analyze-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUsername, studentWallet: wallet }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { content: [{ type: 'text', text: `Analysis failed: ${err}` }], isError: true };
      }
      const data = await res.json();
      const lines = [
        `**Prooflink — GitHub Analysis Complete**`,
        `GitHub: ${data.githubUsername}`,
        `Wallet: ${wallet.slice(0, 8)}...${wallet.slice(-4)}`,
        `Domain: ${data.primaryDomain}`,
        `Level: ${data.academicLevel}`,
        '',
        `**${data.attestationCount} skills attested on-chain:**`,
        ...data.topSkills.map(
          (s: { name: string; score: number; evidence: string }) =>
            `- ${s.name} (${s.score}%) — ${s.evidence}`
        ),
        '',
        `View passport: ${API_URL}/profile/${wallet}`,
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Tool error: ${msg}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
