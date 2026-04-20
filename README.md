# Proof of Talent

Decentralized talent oracle — Chainlink for human capital, with an x402 micropayment API for AI hiring agents.

## What it is

Proof of Talent converts developer artifacts (GitHub profiles, Canvas LMS exports) into on-chain skill attestations anchored on Solana via the [Solana Attestation Service (SAS)](https://explorer.solana.com/address/FJ8myMh9dRcgc2n8xBrWTbCrFYAbHQZCPtMzhhmvNo4M?cluster=devnet). Attestations are queryable via a paid verification API priced for machine-scale agentic workflows using the x402 micropayment protocol.

## Problem

- Resumes and transcripts are unstructured, unverifiable trust signals
- Traditional credential checks are too slow and expensive for AI-native hiring
- Autonomous recruiting agents need low-latency, machine-readable trust primitives at sub-cent cost

## Solution

| Layer | What it does |
|---|---|
| Evidence ingestion | GitHub profile analysis + Canvas LMS ZIP parsing |
| Skill inference | LLM analysis → typed skill claims with confidence scores + evidence summaries |
| On-chain anchoring | SAS Credential + Schema + per-skill Attestation accounts (owned by `FJ8myMh…`) |
| Verification API | x402 micropayment-gated REST API (`250 raw USDC ≈ $0.00025 per lookup`) |
| Validation registry | Optimistic staking model — validators stake SOL, challengers post bonds, 48h dispute window |

## Architecture

```
GitHub / Canvas ZIP
        │
        ▼
  LLM skill inference (Anthropic / OpenAI via AI SDK)
        │
        ▼
  SAS on-chain attestation (Credential → Schema → Attestation PDA)
        │
        ▼
  Neon Postgres index (fast lookups, replay protection)
        │
        ▼
  x402 verification API  ←  AI hiring agents / recruiters
```

## API surface

| Endpoint | Auth | Description |
|---|---|---|
| `GET /` | none | Demo UI |
| `GET /health` | none | Oracle status + wallet |
| `POST /api/analyze-github` | none | Ingest GitHub profile → mint attestations |
| `POST /api/analyze-canvas` | none | Ingest Canvas ZIP → mint attestations |
| `GET /api/profile/:wallet` | none | All attested skills for a wallet (free) |
| `GET /api/verify?wallet=&skill=` | x402 USDC | Verified skill lookup (paid) |
| `GET /api/oracle-info` | none | Oracle config, USDC payment details |
| `POST /api/registry/register` | none | Validator stakes SOL to vouch for attestation |
| `POST /api/registry/challenge` | none | Challenger posts bond to dispute attestation |
| `GET /api/registry/status/:attestation` | none | Dispute status + window remaining |
| `POST /api/registry/resolve` | none | Resolve dispute after 48h window |

### x402 payment flow

```bash
# 1. Call verify — get 402 with payment instructions
curl -i "http://localhost:3000/api/verify?wallet=<wallet>&skill=react"

# Response 402:
# {
#   "payment": {
#     "protocol": "x402",
#     "token": "USDC",
#     "mint": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
#     "recipient": "<oracle-usdc-ata>",
#     "amount": 250,
#     "humanAmount": "0.000250 USDC"
#   }
# }

# 2. Send USDC to the oracle's token account, get tx signature
# 3. Retry with proof header
curl -H "X-Payment-Proof: <tx-signature>" \
  "http://localhost:3000/api/verify?wallet=<wallet>&skill=react"
```

### Validation registry flow

```bash
# Validator stakes SOL to vouch for an attestation
curl -X POST http://localhost:3000/api/registry/register \
  -H "Content-Type: application/json" \
  -d '{"attestationAddress":"<addr>","validatorWallet":"<wallet>","txSignature":"<stake-tx>"}'

# Challenger disputes with bond
curl -X POST http://localhost:3000/api/registry/challenge \
  -H "Content-Type: application/json" \
  -d '{"attestationAddress":"<addr>","challengerWallet":"<wallet>","reason":"...","txSignature":"<bond-tx>"}'

# Check dispute status
curl http://localhost:3000/api/registry/status/<attestation-address>

# Resolve after 48h window
curl -X POST http://localhost:3000/api/registry/resolve \
  -H "Content-Type: application/json" \
  -d '{"attestationAddress":"<addr>"}'
```

## Getting started

### Prerequisites

- Node.js 20+
- Devnet-funded Solana keypair (oracle signing wallet)
- Neon Postgres database
- At least one inference key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`)

### Environment

Create `.env`:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=<base58_private_key>
DATABASE_URL=<neon_postgres_connection_string>

# Inference provider (at least one required)
ANTHROPIC_API_KEY=<optional>
OPENAI_API_KEY=<optional>
OPENROUTER_API_KEY=<optional>
INFERENCE_MODEL=openai/gpt-4o-mini

# Optional: increase GitHub API rate limits
GITHUB_TOKEN=<optional>
```

### First-time setup

Run the SAS setup script once to create the on-chain Credential and Schema:

```bash
npm run setup-sas
```

This writes `oracle-config.json` with the Credential and Schema addresses. Do not delete this file.

To create the oracle's USDC token account on devnet (required for x402 payments):

```bash
spl-token create-account Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr \
  --url devnet \
  --owner <oracle-wallet>
```

### Run

```bash
npm install
npm run oracle
```

Open `http://localhost:3000` for the demo UI.

### Demo pipeline (CLI)

```bash
# GitHub-based (real or mock data)
npm run demo -- <canvas-export.zip> <student-wallet>
npm run demo -- --mock <student-wallet> --skip-mint
```

## On-chain attestations

Each skill produces a real SAS Attestation PDA visible in Solana Explorer:

- Program: `FJ8myMh9dRcgc2n8xBrWTbCrFYAbHQZCPtMzhhmvNo4M`
- Data field: borsh-encoded JSON `{ wallet, skill, score, evidence }`
- Expiry: 1 year from mint date
- Nonce: unique keypair per attestation (prevents PDA collision for multi-skill students)

## Repository map

```
src/
  api/oracle.ts               — Hono server, x402 gating, all routes
  pipeline/
    parseGitHub.ts            — GitHub profile evidence collector
    parseCanvas.ts            — Canvas LMS ZIP parser
    inferSkills.ts            — LLM skill inference (AI SDK)
    mintAttestation.ts        — SAS on-chain attestation writer
  validation-registry/
    index.ts                  — Staking, challenge, dispute resolution (Neon DB)
  scripts/
    setup-sas.ts              — One-time SAS Credential + Schema initializer
public/
  index.html                  — Infrastructure-grade demo UI
oracle-config.json            — Credential + Schema addresses (generated by setup-sas)
```

## Business model

| Tier | Who | Price |
|---|---|---|
| Student | Developers getting attested | First attestation free, $8/year refresh |
| Recruiter | Hiring teams + ATS integrations | $29–99/month subscription |
| Machine | AI agents, automated pipelines | 250 raw USDC per lookup (~$0.00025) via x402 |

## Troubleshooting

- `EADDRINUSE: 3000` — stop existing process (`lsof -ti:3000 | xargs kill`) and restart
- `402 Payment Required` — expected; send 250 raw USDC to the oracle's token account and retry with `X-Payment-Proof`
- `oracle-config.json not found` — run `npm run setup-sas` first
- GitHub rate limit errors — set `GITHUB_TOKEN` in `.env`
- Inference failures — verify provider keys and `INFERENCE_MODEL` value
- `sas-lib` PDA errors — confirm `oracle-config.json` was created by the same oracle wallet currently in `.env`
