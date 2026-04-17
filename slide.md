# Proof of Talent - 2 Minute Pitch Deck

This document captures a detailed 7-slide structure for a 2-minute demo-day pitch.

## Slide 1 - Title + Vision (10-12s)

**Title:** Proof of Talent  
**Subtitle:** Verifiable skill infrastructure for AI-native hiring

**Content**
- "DePIN for human capital"
- Converts developer artifacts into machine-readable skill attestations
- Anchors proof on Solana + exposes verification API for agents

**Visual**
- One clean pipeline graphic: `GitHub Evidence -> AI Inference -> On-chain Proof -> Recruiter API`

**Talk track**
- "Proof of Talent is trust infrastructure for hiring in an AI-agent world."

## Slide 2 - Problem (18-20s)

**Title:** Hiring Trust Is Broken for Machines

**Content**
- CVs, grades, and claims are noisy proxies for actual skill
- Existing verification is manual, slow, and expensive
- AI recruiting agents can screen at scale, but cannot trust unstructured claims
- No cheap API-native trust layer exists for skill verification

**Visual**
- Left side: current stack (`Resume`, `LinkedIn`, `Transcript`)
- Right side: agent needs (`Structured score`, `Evidence`, `Proof`, `API`)

**Talk track**
- "We have screening automation, but no verifiable skill primitive that machines can query."

## Slide 3 - Why Now (15-18s)

**Title:** Why Build This Now

**Content**
- AI recruiting workflows are moving from human-only to agent-assisted
- Cost of false positives and false negatives rises with applicant volume
- Micropayments are now viable on high-throughput, low-fee chains like Solana
- Open-source contribution history (GitHub) is now a primary technical signal

**Visual**
- Timeline with four converging forces: `AI Agents`, `API Hiring`, `Low-Fee Chains`, `Public Code Evidence`

**Talk track**
- "The market just crossed a threshold where machine-scale trust verification is both needed and technically feasible."

## Slide 4 - Solution (20-22s)

**Title:** What Proof of Talent Does

**Content**
1. Ingests public developer evidence (GitHub)
2. Uses AI to infer skills, confidence, and evidence summary
3. Anchors claim receipts on Solana (memo-based in current MVP)
4. Serves recruiter-grade APIs:
   - profile lookup
   - paid skill verification (`x402`-style flow)

**Visual**
- Four numbered cards
- Include one compact sample JSON block (`skill`, `confidence`, `txSignature`)

**Talk track**
- "We turn unstructured work into structured, verifiable, machine-readable talent signals."

## Slide 5 - User Flow (20-22s)

**Title:** End-to-End User Flow

**Content**
- Student submits GitHub + wallet
- Oracle analyzes, scores, and anchors proof transactions
- Recruiter or bot checks `GET /api/profile/:wallet`
- Recruiter or bot verifies specific skill via `GET /api/verify`
  - no proof -> `402 Payment Required`
  - with proof -> verified result + evidence + explorer link

**Visual**
- Swimlane diagram with three lanes:
  - Student
  - Proof of Talent Oracle
  - Recruiter Agent

**Talk track**
- "One endpoint gives breadth, one gives paid depth on demand."

## Slide 6 - Business Model + Unit Logic (16-18s)

**Title:** Monetization

**Content**
- Per-verification micropayment (target `$0.00025` in MVP config)
- Team plans for recruiters (higher throughput + analytics)
- Future issuer tooling for institutions and bootcamps

**Unit logic**
- Low per-call cost enables machine-scale lookups
- Revenue scales with automated screening volume

**Visual**
- Funnel: `Lookups -> Paid Verifications -> Subscription Upsell`

**Talk track**
- "We monetize verification events directly, then layer SaaS on top."

## Slide 7 - Product Status + Roadmap (20-22s)

**Title:** What Exists Now, What Comes Next

**Now (working MVP)**
- GitHub ingestion
- AI skill inference
- On-chain proof transaction links
- `profile` and `verify` APIs
- Live `402` and verified flow in demo UI

**Next**
- Full SAS-native issuance lifecycle
- Stronger payment-proof validation (amount, recipient, freshness)
- Production data layer (database + indexer)
- Revocation, supersession, and dispute workflows

**Visual**
- Two-column maturity map: `Now` vs `Next`

**Talk track**
- "The core loop works today; roadmap upgrades trust guarantees and production readiness."

## Optional Backup Slide (if time allows)

**Title:** AI + Blockchain Role Split

- AI = interpretation engine
- Chain = tamper-evident trust anchor
- API = productization + monetization layer

## Timing Guide

- Slide 1: 10s
- Slide 2: 20s
- Slide 3: 17s
- Slide 4: 22s
- Slide 5: 22s
- Slide 6: 17s
- Slide 7: 22s

Total: approximately 130s, then trim 5-10s during delivery.
