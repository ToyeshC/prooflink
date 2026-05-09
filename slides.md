# Prooflink — Pitch Deck Outline

**Audience:** Colosseum Frontier hackathon judges
**Framing:** AI-native oracle for human capital (NOT "talent credential platform")
**Winner signals to hit:** oracle, staking, NLP/AI, x402 — these primitives overindex among Colosseum winners

---

## Video Pitch (2-min format — Superteam template)

> **Format:** 5 slides · 2-minute video · Template from https://nl.superteam.fun/pitch-deck
> The team slide is the most important — judges need faith that YOU are the people to build this.

| Slide | Time | Content | Maps to |
|-------|------|---------|---------|
| **V1 — Hook** | 0:00–0:15 | "The resume is a lie. And AI agents know it." Sub: Prooflink is a decentralized oracle that converts work evidence into verifiable skill claims at $0.01/lookup. | Slide 1 |
| **V2 — Problem** | 0:15–0:35 | **Pool:** $10B+ skills verification market. **Gap:** No machine-readable trust primitive AI agents can query at inference time. **Friction:** Checkr costs $29.99–$200/check — doesn't work at 100,000 decisions/night. | Slide 2 |
| **V3 — Solution** | 0:35–0:55 | An oracle that: takes GitHub evidence → AI scores skill at 91% confidence → SAS anchors it on Solana → agents pay $0.01 per lookup via x402 or `pay curl`. Live on devnet. MCP-native. | Slides 3+4 |
| **V4 — Team** | 0:55–1:55 | *See Team Slide below — 60 seconds, the most important slide* | Team slide |
| **V5 — Traction** | 1:55–2:00 | Real SAS attestations on devnet · x402 payment rail live · MCP server callable from Claude Desktop · 3 staked validators · 7 attested skills on demo wallet | Slide 8 |

---

## Team Slide (V4 — fill before recording)

**Headline:** We are the people to build this because [X].

**Talking points to cover (60 seconds):**
- **Who you are:** Name, current role/background
- **Why you specifically:** What relevant experience do you have with Solana, AI/LLMs, or hiring/credentialing that others don't?
- **Why this problem:** Personal connection to skills verification being broken — have you hired, been hired, been misjudged by a resume?
- **Why now:** What made you build this at this exact moment (e.g., saw AI hiring agents proliferate, SAS launched, x402 emerged)?
- **Credibility signal:** Any Solana projects shipped, previous builds, or domain expertise that de-risks execution

> ⚠️ Per the Superteam template: "judges need to gain faith that you are the people to build this idea." This is the make-or-break slide. Spend more prep time here than any other slide.

---

## Slide 1 — Hook

**Headline:** The resume is a lie. And AI agents know it.

**Sub-headline:** Prooflink is a decentralized oracle that converts actual work evidence into verifiable skill claims — owned by the worker, queryable by machines.

**Visual idea:** Split screen — left: AI agent with thousands of resumes to screen, no trust signal. Right: structured JSON from Prooflink with confidence score, SAS attestation hash, and stake-backed claim.

**One-liner for the deck:**
> AI audits raw evidence → SAS anchors the claim → agents pay $0.01 per lookup

**The analogy judges need:**
> Chainlink is a data oracle for DeFi protocols. Prooflink is a skill oracle for AI hiring agents.

**Badge:** `Solana · SAS · x402 · MCP · LIVE ON DEVNET`

---

## Slide 2 — The Problem (Tech-Independent Framing)

**Headline:** The skills verification market is broken — and it was broken long before AI, blockchain, or any of our tech stack existed.

**Problem framed without tech:**
- A worker does real, meaningful technical work. It leaves no portable proof.
- The only signal employers have is a degree, a job title, or a self-written resume — none of which are verifiable without a phone call, a $40–200 background check, or trusting a university database you don't have access to.
- A human recruiter can screen 10 candidates a day. An AI hiring agent will screen 100,000 candidates overnight. The trust primitive that worked at human scale **completely breaks** at machine scale.

**The three failures (no jargon):**
1. **Credentials measure compliance, not competence.** A CS degree proves you sat through four years of lectures. It doesn't prove you can write production code.
2. **Verification is prohibitively expensive.** Checkr charges $29.99–$200 per background check. That math works for 10 hires/year. It doesn't work for an AI agent making 10,000 decisions per night.
3. **No machine-readable trust primitive exists.** There is no API an AI agent can call to ask "is this person actually good at Rust?" and get a structured, trustworthy answer.

**The market context:**
- Skills verification is a $10B+ market (HireVue, Karat, Codility, HackerRank)
- These companies charge $100–400 per technical assessment
- They're built for human-paced hiring — not agent-paced hiring
- None of them have an API that AI agents can query at inference time

**Key stat:**
> Checkr: $29.99/check · Prooflink: $0.01/check · **30,000× cheaper**

---

## Slide 3 — Why Now: Four Convergent Forces

**Headline:** Four things became true simultaneously. The window is now.

This problem isn't new. What's new is that the infrastructure to solve it at machine scale just appeared — all at once.

**Force 1: AI agents now do hiring at scale (and they need trust primitives)**
Automated screening went from "nice to have" to default in 2025. AI hiring agents evaluate hundreds of thousands of candidates per run. They can't trust unstructured claims. There is no structured trust primitive they can query programmatically — until now.

**Force 2: Solana Attestation Service (SAS) launched**
SAS gives us a native, interoperable on-chain credential layer. Before SAS, "on-chain attestations" meant NFTs or memo transactions — not real credential infrastructure. SAS provides: Schema definition, Credential issuance, Attestation PDAs with expiry. The infrastructure to anchor trustworthy claims on Solana simply didn't exist 18 months ago.

**Force 3: x402 makes HTTP-native micropayments viable for agents**
Solana's parallel transaction engine makes $0.01-per-lookup profitable at 75% gross margin ($0.01 tx cost, $0.00019 profit per call). The x402 standard brings payment-gated HTTP APIs to the open web. AI agents can pay each other without accounts, without API keys, without a human in the loop. CORBITS.DEV won 2nd Place Infrastructure at Cypherpunk 2025 using x402 — this pattern is validated.

**Force 4: Public artifacts are now the most honest technical signal**
GitHub history and Canvas course submissions are the most verifiable technical evidence that exists — and they're queryable. A GitHub profile shows actual code written, actual repos committed to, actual languages used over time. We bypass institutional gatekeeping entirely and go directly to the work.

---

## Slide 4 — The Solution

**Headline:** An oracle that converts work evidence into sovereign, structured, stake-backed skill claims.

### Without tech first (the core idea)
A service that:
1. Accepts raw work artifacts (GitHub history, course submissions)
2. Has an AI evaluate them against industry skill standards
3. Issues a verifiable claim: "this person demonstrated Rust competence at 91% confidence"
4. Makes that claim queryable by any machine for fractions of a cent

That's the business. Here's how the tech makes it trustless, sovereign, and infinitely scalable:

### With the tech stack
```
Evidence (GitHub repos + Canvas ZIP exports)
    ↓
AI Oracle (LLM skill inference → typed claims with confidence scores)
    ↓
SAS Attestation (on-chain PDA: wallet + skill + confidence + evidence hash)
    ↓
Validation Registry (validators stake SOL to back the claim, 48h dispute window)
    ↓
x402 API + MCP Tools (agents pay per lookup — no accounts, no keys, just pay)
```

### The four layers
| Layer | What it does | Why it matters |
|-------|-------------|----------------|
| **Ingest** | GitHub API + Canvas ZIP parser | Evidence from actual work, not self-reported |
| **Infer** | LLM scores skill, confidence, evidence summary | AI interprets raw evidence into structured claims |
| **Anchor** | SAS Credential → Schema → Attestation PDA | On-chain, sovereign, composable, not deletable |
| **Serve** | x402 REST API + MCP tools | Machine-native access at $0.01/call |

### What an agent receives
```json
{
  "skill": "rust",
  "confidence": 0.91,
  "evidence": "14 Rust repos · Anchor framework · 847 commits",
  "sasAttestation": "3xY8...k9mP",
  "staked": true,
  "sovereign": true
}
```

---

## Slide 5 — What Happens If You Remove The Tech?

**Headline:** The tech makes it infinitely scalable. The problem is real without any of it.

This is a critical test: is this a real business, or is it "blockchain for blockchain's sake"?

### Remove Solana and on-chain attestation
You still have: AI oracle + centralized database.
That's a $10B+ industry. HireVue ($400M revenue). Karat. Codility. They all verify skills and charge $100–400 per assessment. The product still works — it's just less sovereign and less composable.
**What you lose:** Worker ownership of their data. Trustless third-party verification. Composability with other protocols. Censorship resistance. Economic accountability through staking.
**The blockchain makes the claim portable and trustless, not just functional.**

### Remove AI inference
You still have: human reviewers examining GitHub profiles + Canvas exports + issuing claims.
That's also a real service. Triplebyte (before shutdown) charged $350 per technical screen. Karat charges $200–500 per interview.
**What you lose:** The ability to scale to millions of claims at $0.01 per claim. A human reviewer can assess 5 candidates per day. The oracle can process 5,000.
**The AI makes it economically viable at machine scale, not just in principle.**

### Remove x402 micropayments
You still have: API key + traditional subscription billing.
That's still a programmable API. Just not natively agent-payable.
**What you lose:** The ability for AI agents to pay each other autonomously without accounts or keys. The agentic economy layer.
**x402 makes the oracle native to the AI agent economy, not just accessible to it.**

### Remove all three
You have: a technical assessment service that issues portable skill certificates.
HireVue: $400M revenue. Codility: $100M+. HackerRank: $100M+. These businesses exist and are funded.

**The conclusion:**
The tech stack doesn't create the market — it makes the solution:
- **30,000× cheaper** (blockchain tx cost vs. Checkr check)
- **Infinitely scalable** (AI vs. human reviewers)
- **Sovereign** (worker owns the attestation, can't be deleted)
- **Agent-native** (x402 means AI agents can use it without a human)

---

## Slide 6 — How It Works (User Flow)

**Headline:** One endpoint for breadth. Paid depth on demand.

```
STUDENT / DEVELOPER                    PROOFLINK ORACLE                    RECRUITER / AI AGENT
─────────────────────                  ─────────────────                   ────────────────────
Submit GitHub + wallet address    →    Fetch repos · PRs · commits
                                       Parse Canvas ZIP (if provided)
                                       LLM scores skill + confidence
                                       Write SAS attestation to Solana    
Receive attestation + explorer         ZK-style evidence hashing ←→       GET /api/profile/:wallet
link. Sovereign. Portable.                                                 Free. Filter at breadth.
                                                                           
Dispute: stake SOL to challenge  ←→   Optimistic 48h window              GET /api/verify → 402 ↓
                                       Re-evaluate on stake                $0.01 basic
                                                                           $0.001 premium (ZK-backed)
                                                                           verified: true + SAS tx
```

**The x402 payment pattern:** AI agents pay each other. No human in the loop.
- No account creation
- No API key management  
- No billing integration
- Just: send USDC → get verified claim

**MCP access:** For Claude Desktop + Cursor — native tool calls, no REST required.
```typescript
await mcp.call("verify_skill", { wallet: "...", skill: "rust" });
// → { verified: true, confidence: 91, evidence: "...", attestation: "3xY8..." }
```

**CLI / pay.sh access:** AI agents auto-pay with one command — no API key, no account, no integration code.
```bash
pay curl "https://[ngrok-or-deployed-url]/api/verify?wallet=...&skill=python"
# pay.sh detects the 402, signs the USDC tx, retries automatically
# → { verified: true, confidence: 90, attestation: "..." }
```
> pay.sh (Solana Foundation + Google Cloud) is the canonical agent-native payment client for x402-gated APIs. Zero custom code from the agent side.

---

## Slide 7 — Confidence Score Methodology

> ⚠️ **Transparency required** — judges explicitly requested this at the May 5 host meeting.

**Headline:** How does the oracle decide 91% vs. 70% vs. 45%?

### Signal hierarchy
The LLM evaluates evidence in a strict priority order:

```
Code evidence (highest weight)
  → Actual committed code in repos
  → Language distribution across commits
  → Framework usage and project complexity
  → Contribution patterns over time

Course content (secondary weight)
  → Canvas ZIP: assignment descriptions, syllabus content
  → Code submissions and project work
  → NOT grades — grades measure effort, not competence

Grades (lowest weight — proxy only)
  → Used only when code evidence is absent
  → Assignment completion signals domain exposure, not skill
```

### Confidence thresholds
| Score | Label | What it means |
|-------|-------|---------------|
| ≥ 0.70 | Demonstrated competence | Actual code in production-quality projects. Trustable for a hiring decision. |
| 0.50–0.69 | Working knowledge | Exposure with some project experience. Suitable for junior roles. |
| < 0.50 | Exposure only | Course exposure or minimal projects. Don't claim fluency. |

### The rule: code evidence or it doesn't count
The LLM is explicitly instructed: **"Only claim skills where you can cite actual code evidence."** If a student took a Python course but never wrote Python code in their GitHub, they do not receive a Python attestation at ≥0.70.

### What prevents gaming?
1. **Evidence audit:** Confidence is tied to specific repo names, commit counts, and code samples. The LLM must cite the evidence, not just assert the score.
2. **Economic accountability:** Validators stake real SOL to back each attestation. If a claim is challenged within 48 hours, the oracle re-evaluates. If the re-evaluation confidence drops below 0.70, the validator is slashed.
3. **Dispute mechanism:** Anyone who doubts a claim can post a bond to trigger re-evaluation. Honest signals emerge from the arbitrage.

---

## Slide 8 — Traction & Live Demo

**Headline:** Core loop works today — on-chain, on devnet, live.

### What's live right now
- **Real SAS attestations** visible on Solana Explorer (not mocked, not NFTs — actual PDAs)
- **Demo wallet:** `FLkqg6fUP39vWkcxV9ZzLKWrBjRoX2YmccLcEkobZyEZ`
  - 7 skills attested: python (90%), openai (80%), machine-learning (75%), computer-vision (70%), data-analysis (70%), telegram (65%), data-visualization (60%)
- **x402 payment flow:** working end-to-end — send 10000 raw USDC, get verified claim
- **MCP server:** 3 tools callable from Claude Desktop + Cursor
- **Validation registry:** 3 staked validators (python: 5.2 SOL, ML: 2.15 SOL, openai: 1.42 SOL)
- **Phantom wallet signing:** one-click SOL stake/bond via wallet extension — no manual tx copy-paste

### Demo URLs
- **Live demo (ngrok):** `http://localhost:3000` + `ngrok http 3000` — use this for the live pitch (avoids 60s cloud timeout)
- **Persistent judge URL:** `https://prooflink-five.vercel.app/` — always on, 60s timeout, suitable for async review
- Oracle info: `GET /api/oracle-info`
- Sample profile: `GET /api/profile/FLkqg6fUP39vWkcxV9ZzLKWrBjRoX2YmccLcEkobZyEZ`

### Technical completeness
| Feature | Status |
|---------|--------|
| GitHub evidence ingestion | ✅ Live |
| Canvas ZIP ingestion | ✅ Live |
| AI skill inference (Claude / OpenRouter) | ✅ Live |
| SAS on-chain attestations | ✅ Live (devnet) |
| x402 USDC payment rail | ✅ Live |
| MCP server (3 tools) | ✅ Live |
| Validation registry + staking | ✅ Live |
| Agent discovery (`.well-known/`, Link headers) | ✅ Live |
| ZK privacy layer | ⬜ Roadmap |
| Mainnet deployment | ⬜ Roadmap |

---

## Slide 9 — Competitive Moat

**Headline:** Every similar project uses NFTs, escrow, and "decentralized marketplace." We don't.

### What Colosseum winners avoid (that most projects use)
- NFTs for credentials: -66% vs. field — we use SAS (real interoperable attestation PDAs)
- Token-gating: -55% vs. field — no token required
- Smart contract escrow: -100% among winners — not our model

### What Prooflink has that no other project does
| Differentiator | Why it matters |
|---------------|----------------|
| **Dual evidence ingestion (GitHub + Canvas)** | 0 other projects in 5,400+ Colosseum submissions had both. Academic evidence fills the gap for students without public GitHub history. |
| **SAS-native attestations** | Not NFTs. Not memo transactions. Real SAS Credential → Schema → Attestation PDAs. Interoperable with any SAS consumer. |
| **MCP-native discovery** | AI agents can query via Claude Desktop/Cursor without any REST integration code. Only project in the talent space with MCP tools. |
| **Economic accountability layer** | Validators stake real SOL to back claims. 48h dispute window. Slashing for wrong claims. No other talent oracle has this. |
| **x402 payment rail** | CORBITS.DEV won 2nd Place Infrastructure in Cypherpunk 2025 with x402. This pattern is validated. We use it for the oracle, not just the payment layer. |

### Adjacent winners (validates the stack)
- **CORBITS.DEV** (2nd Place Infrastructure, Cypherpunk 2025): x402 for AI agents to pay APIs — same payment primitive, different application
- **Project Plutus** (2nd Place AI, Breakout 2025): AI agent deployment on Solana — same agent-infrastructure framing

---

## Slide 10 — Business Model

**Headline:** Infrastructure economics — revenue scales with AI hiring adoption.

### Revenue streams

| Tier | Customer | Price | Status |
|------|----------|-------|--------|
| **Machine (x402)** | AI agents, automated pipelines | $0.01 basic / $0.001 premium / $0.005 ZK-backed | ✅ Live |
| **Recruiter SaaS** | Hiring teams, ATS integrations | $49–299/month subscription | ⬜ Post-hackathon |
| **Issuer Plans** | Bootcamps, universities | $999/month — issue attestations for cohorts | ⬜ Post-hackathon |
| **Dispute Fees** | Protocol | 10% cut on resolved disputes | ⬜ Post-hackathon |

### Revenue at machine scale
| Verifications/Day | API Revenue/Year | + SaaS | ARR |
|-------------------|-----------------|--------|-----|
| 1,000 | $365K | $240K | $605K |
| **10,000** | **$3.65M** | **$960K** | **~$4.6M** |
| 100,000 | $36.5M | $3.6M | ~$40M |

*At $0.001/call basic, 75% gross margin ($0.01 Solana tx cost).*

### Why x402 at $0.01 isn't the whole story
x402 is the **agent-native entry point**, not the primary revenue model. It establishes the oracle as a trusted infrastructure primitive at zero friction. The B2B subscription tier ($49–299/month) is the primary ARR path — one paying enterprise customer at $299/month beats 1.2 million x402 calls.

---

## Slide 11 — Roadmap

**Headline:** Clean up, not build up. Then expand trust guarantees.

*Note: Per judge feedback (May 5) — focus is on polish and cleanup, not new features.*

### Immediate (before mainnet)
1. **Confidence score transparency UI** — methodology tooltip on every attestation, `/methodology` page ✅ done
2. **"Profile queried X times" stat** — surface query count on passport page for retention loop ✅ done
3. **Security audit** (`/cso`) — before handling real money on mainnet
4. **Demo infrastructure** — run locally + ngrok for live demo (avoids cloud timeout) ✅ done

### Near-term (post-hackathon)
- Mainnet deployment after security audit
- B2B recruiter subscription tier ($49–299/month)
- Search endpoint (`GET /api/search?skill=rust&minConfidence=80`)
- ZK-privacy layer for raw evidence (protect student data)
- Canvas ZIP ingestion expanded to more LMS export formats

### Long-term
- First enterprise customer: a single Solana-native company hiring Rust engineers (Helius, Jito, Triton, DoubleZero)
- GitHub OAuth for higher-trust evidence
- Agent-to-agent hiring market: when AI-managed agents hire human contractors, Prooflink is the trust layer

---

## Speaker Notes & Talking Points

### Opening hook (10s)
> "Every time an AI agent screens a resume, it's trusting a text file that could say anything. We built the oracle that tells agents which claims are actually true — at $0.01 per lookup, 30,000 times cheaper than a background check."

### On crypto necessity (if asked)
> "Replace Solana with a database and you lose three things: the worker owns nothing — the platform can delete their record. Third parties can't verify without trusting us. And the staking/dispute mechanism can't exist without trustless settlement. The blockchain is load-bearing, not decorative."

### On AI necessity (if asked)
> "Replace the AI with human reviewers and you charge $200–400 per assessment, like Karat and Codility do. The AI makes this work at $0.01 per call — that's the difference between a service for enterprise HR departments and a service for AI agents making 100,000 decisions per night."

### On confidence scores (use the methodology slide)
> "91% means: the LLM found actual Rust code — 14 repositories, Anchor framework, 847 commits. It's not guessing from a course name. And if someone disputes the 91%, a validator who staked 5 SOL to back that claim now has skin in the game. The economic incentive creates honest signal."

### On x402 (if asked about CORBITS comparison)
> "CORBITS.DEV won 2nd Place Infrastructure at Cypherpunk by building the merchant dashboard for x402. We use x402 as the payment rail for the oracle — different layer, same protocol. It's a validated pattern for AI agent payments on Solana."

### On the talent cluster having no winners (if pressed)
> "Every project that framed itself as a 'decentralized talent marketplace' lost. We're not that — we're infrastructure. The oracle frame puts us in the AI Agent Infrastructure cluster, which has a 4.3% win rate. The framing is the product."

---

## What's Missing From This Deck

*(Things to add if time allows before submission)*

1. **Team slide** — who is building this, what's the relevant background, why are you the right person to solve this
2. **One real testimonial or pilot signal** — even a verbal "I would use this" from a Solana-native company counts
3. **Network effects slide** — as more attestations accumulate, the oracle becomes more trusted. This isn't explicitly in the deck yet.
4. **The "Chainlink for talent" analogy** — Chainlink is a data oracle for DeFi protocols. Prooflink is a skill oracle for AI hiring agents. This analogy is powerful for crypto-native judges and should be in the one-liner.
