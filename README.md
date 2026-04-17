# Proof of Talent

Proof of Talent is a talent verification infrastructure layer for AI-native hiring.
It converts public developer work into machine-readable skill attestations, anchors proof on Solana, and exposes a programmable verification API priced for agentic workflows.

## Vision

Resumes and transcripts are unstructured trust signals.  
Proof of Talent aims to become the trust rail for verifiable human capital: identity-bound, portable, and queryable by recruiting software and autonomous hiring agents.

## Problem

Modern hiring systems face a validity gap:

- static credentials are weak proxies for skill
- claims are hard to verify programmatically
- traditional checks are too expensive for machine-scale screening
- AI recruiters need low-latency, low-cost trust primitives

## Solution

Proof of Talent delivers four core capabilities:

- Evidence ingestion from developer artifacts (currently GitHub-first)
- LLM-based skill inference with confidence and evidence summaries
- On-chain proof anchoring on Solana (memo-based in current MVP)
- Paid verification API (`x402` pattern) for machine-to-machine lookups

## Product flow

1. Student submits GitHub username + Solana wallet
2. Oracle analyzes evidence and infers skill claims
3. Qualifying claims are anchored in Solana transactions
4. Claims are indexed for low-latency API access
5. Recruiters and bots query profile and verification endpoints

## API surface

- **Profile lookup (free):** `GET /api/profile/:wallet`
- **Skill verify (paid):** `GET /api/verify?wallet=<wallet>&skill=<slug>`
  - no proof -> `402 Payment Required`
  - valid proof -> `verified: true` + attestation metadata

### Example

```bash
curl "http://localhost:3000/api/profile/<wallet>"
```

```bash
curl -i "http://localhost:3000/api/verify?wallet=<wallet>&skill=<skill-slug>"
```

```bash
curl -H "X-Payment-Proof: <tx-signature>" \
  "http://localhost:3000/api/verify?wallet=<wallet>&skill=<skill-slug>"
```

## Architecture (current MVP)

- **Frontend:** static demo UI (`public/index.html`)
- **API/Oracle:** Hono server (`src/api/oracle.ts`)
- **Inference:** AI SDK + Anthropic/OpenRouter providers
- **On-chain anchor:** Solana memo transactions per qualifying skill
- **Index layer:** file-based store (`attestation-index.json`) for fast profile/verify reads

## Why Solana

- low transaction costs enable micropayments (`~$0.00025` target lookup fee)
- fast finality supports realtime verification UX
- composable public state enables interoperability with future attestation standards

## Business model (early)

- **Usage-based:** per-lookup micropayments for automated agents
- **B2B SaaS:** recruiter/team plans with API quotas and analytics
- **Issuer tooling:** institutions/bootcamps issuing high-trust attestations

## Getting started

### Prerequisites

- Node.js 20+
- npm
- devnet-funded Solana keypair for oracle signing
- at least one inference key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`)

### Environment

Create `.env`:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=<base58_private_key_for_oracle_wallet>

# inference provider
ANTHROPIC_API_KEY=<optional>
OPENAI_API_KEY=<optional>
INFERENCE_MODEL=openai/gpt-4o-mini

# optional GitHub API headroom
GITHUB_TOKEN=<optional>
```

### Install and run

```bash
npm install
npm run oracle
```

Open:

- `http://localhost:3000` (demo UI)
- `http://localhost:3000/health` (service status)

## Deploy on Vercel (demo mode, no database)

This repository is configured to run on Vercel serverless functions without adding a database.

### What works

- demo UI at `/`
- profile and verify APIs under `/api/*`
- on-chain proof creation and lookup flows

### Important limitation

- `attestation-index.json` writes are not persistent on Vercel instances.
- data is kept in memory per running instance and may reset on cold starts/redeploys.

This is acceptable for a hackathon demo, but not for production.

### Steps

1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. Set these environment variables in Vercel project settings:
   - `SOLANA_RPC_URL`
   - `SOLANA_PRIVATE_KEY`
   - `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
   - optional: `INFERENCE_MODEL`
   - optional: `GITHUB_TOKEN`
4. Deploy.
5. Test:
   - `/health`
   - `/api/profile/:wallet`
   - `/api/verify?wallet=<wallet>&skill=<slug>`

## Repository map

- `src/api/oracle.ts` - API, payment gating, profile/verify routes
- `src/pipeline/parseGitHub.ts` - evidence collection from GitHub
- `src/pipeline/inferSkills.ts` - skill inference schema + model calls
- `src/pipeline/mintAttestation.ts` - on-chain proof transactions
- `public/index.html` - end-to-end demo interface
- `attestation-index.json` - local indexed claim store

## Known limitations and roadmap

Current build is an MVP and intentionally pragmatic:

- file-based indexing (not production database)
- simplified payment-proof validation
- memo-based proof anchoring (not full SAS-native issuance pipeline yet)

Next milestone priorities:

1. Full SAS schema/credential/attestation lifecycle integration
2. Production indexing (Postgres + chain/event indexer)
3. Revocation/supersession and dispute workflows
4. Stronger identity binding and policy controls
5. Recruiter bot reference integration

## Troubleshooting

- `EADDRINUSE: 3000` -> stop existing process and restart
- `402 Payment Required` -> expected when `X-Payment-Proof` is missing
- GitHub rate-limit errors -> set `GITHUB_TOKEN`
- inference failures -> verify provider keys and model config
