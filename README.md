# Proof of Talent

Proof of Talent is a hackathon MVP for a decentralized talent oracle on Solana.  
It analyzes developer evidence (currently GitHub), infers market-ready skills with an LLM, and exposes attestations through a recruiter-facing API with an x402 micropayment gate.

## What this MVP includes

- GitHub evidence ingestion and summarization
- LLM-based skill inference
- On-chain proof transaction per qualifying skill (devnet, memo-based)
- Oracle API for:
  - profile lookups (`/api/profile/:wallet`)
  - paid skill verification (`/api/verify?wallet=...&skill=...`)
- Demo frontend at `/` for end-to-end walkthrough

## Tech stack

- TypeScript + Node.js
- Hono (`@hono/node-server`) for API and static demo page
- Solana Web3 + Solana kit (devnet)
- AI SDK + Anthropic/OpenRouter providers

## Prerequisites

- Node.js 20+
- npm
- A devnet-funded Solana keypair for the oracle signer
- At least one AI provider key:
  - `ANTHROPIC_API_KEY`, or
  - `OPENAI_API_KEY` (used with OpenRouter provider path in this repo)

## Environment variables

Create a `.env` file in repo root:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=<base58_private_key_for_oracle_wallet>

# Choose one inference path
ANTHROPIC_API_KEY=<optional>
OPENAI_API_KEY=<optional>
INFERENCE_MODEL=openai/gpt-4o-mini

# Optional, helps GitHub API limits
GITHUB_TOKEN=<optional>
```

## Install

```bash
npm install
```

## Run the oracle + demo UI

```bash
npm run oracle
```

Then open:

- `http://localhost:3000` (demo frontend)
- `http://localhost:3000/health` (health check)

## API usage

### 1) Full profile lookup (free)

```bash
curl "http://localhost:3000/api/profile/<wallet>"
```

Returns all attested skills for that wallet plus stored attestation metadata.

### 2) Skill verification (x402-gated)

Request without payment proof:

```bash
curl -i "http://localhost:3000/api/verify?wallet=<wallet>&skill=<skill-slug>"
```

You should receive `402 Payment Required` with payment instructions.

Request with payment proof header:

```bash
curl -H "X-Payment-Proof: <tx-signature>" \
  "http://localhost:3000/api/verify?wallet=<wallet>&skill=<skill-slug>"
```

If proof is valid and skill exists, response returns:

- `verified: true`
- attestation metadata
- optional Solana explorer verification URL

## Demo flow (recommended for judges)

1. Start server: `npm run oracle`
2. Open UI: `http://localhost:3000`
3. Submit a GitHub username (optionally set a specific wallet)
4. Wait for analysis + attestation minting
5. Show:
   - skill cards
   - explorer links
   - API snippets
6. Click **Live verify test** to show:
   - unpaid 402 response
   - paid verification response (when tx proof is available)

## Project structure

- `src/api/oracle.ts` - API server and demo routes
- `src/pipeline/parseGitHub.ts` - GitHub evidence ingestion
- `src/pipeline/inferSkills.ts` - LLM skill inference schema + call
- `src/pipeline/mintAttestation.ts` - Solana memo-based attestation minting
- `public/index.html` - demo frontend
- `attestation-index.json` - local indexed attestation store

## Notes and current limitations

- This is an MVP; attestation index is file-based (`attestation-index.json`), not a DB.
- Verify endpoint currently validates payment proof existence via transaction lookup.
- "Attestation address" in this MVP is a deterministic id used for indexing; on-chain proof is represented by tx signature.
- Canvas ZIP ingestion exists (`src/pipeline/parseCanvas.ts`) but current UI flow is GitHub-first for demos.

## Troubleshooting

- `EADDRINUSE: 3000`:
  - another server is already running on port 3000; stop it and restart.
- `402 Payment Required`:
  - expected for `/api/verify` without `X-Payment-Proof`.
- GitHub API errors / rate limits:
  - set `GITHUB_TOKEN` in `.env`.
- Inference errors:
  - ensure at least one valid provider key is set.
