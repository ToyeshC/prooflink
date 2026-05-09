# Prooflink — Demo Guide

## The narrative arc

Lead with the use case, not the tech.

**Wrong:** "I built an attestation oracle with SAS and x402 micropayments."
**Right:** "An AI hiring agent just queried for a verified Python dev. It got a 402, auto-paid $0.01, and received a confidence score backed by on-chain attestations. That's Prooflink."

Judges care about: does this solve a real problem, is it live, can agents use it today. Show those three things in order.

---

## Pre-demo setup (do before judges arrive)

```bash
npm start                          # port 3000
ngrok http 3000                    # note the HTTPS URL — call it $NGROK
```

Open in browser tabs:
1. `http://localhost:3000` — main UI (for scan + validator demo)
2. `http://localhost:3000/profile/FLkqg6fUP39vWkcxV9ZzLKWrBjRoX2YmccLcEkobZyEZ` — demo passport

Prepare terminal command (swap `$NGROK`):
```bash
pay curl "$NGROK/api/verify?wallet=FLkqg6fUP39vWkcxV9ZzLKWrBjRoX2YmccLcEkobZyEZ&skill=python"
```

Have Phantom wallet open with devnet SOL loaded (for validator modal demo).

---

## Demo sequence (~3 minutes)

### 1. Hook (0:00–0:30)

Start on the homepage. Don't touch anything yet. Say:

> "Resumes are unverifiable claims. AI hiring agents querying at inference time can't trust them — and they can't afford to call a human oracle for every hire. Prooflink is the on-chain skill oracle that solves this. Think Chainlink for talent."

Point to the hero section. Don't click yet.

---

### 2. Live scan (0:30–1:30)

Enter a GitHub username in the scan terminal. Use your own or a friend's.

Watch the SSE stream in real-time:
- `Fetching GitHub profile…`
- `Inferring skills via Claude…`
- `Minting attestations on Solana devnet…`

When complete: passport page loads at `/profile/{wallet}` with real SAS attestation addresses.

Say: "Each skill card is a real Solana PDA. Not an NFT, not a database record. On-chain, queryable, permanent."

---

### 3. Agent query via pay.sh (1:30–2:00)

Switch to terminal. Run the prepared pay.sh command:

```bash
pay curl "$NGROK/api/verify?wallet=FLkqg6fUP39vWkcxV9ZzLKWrBjRoX2YmccLcEkobZyEZ&skill=python"
```

Watch: 402 Payment Required → pay.sh auto-pays $0.01 USDC → 200 OK with confidence score + attestation address.

Say: "This is what an AI hiring agent sees. No API key, no account, no custom integration. pay.sh detects the 402, signs the USDC transaction, retries. The agent paid for and received verified skill data in one call."

---

### 4. Trust layer — validation registry (2:00–2:30)

Back to browser. Scroll to Validation Registry section on the homepage.

Point to the seeded validator rows. Say: "Anyone can stake SOL to vouch for an attestation. If they're wrong and a challenge is upheld, their stake is slashed. This is the human oversight layer that keeps the oracle honest."

Click **Register as Validator**:
- Connect Phantom (one click)
- Enter attestation address (copy from passport page)
- Enter stake amount (0.1 SOL)
- Click **Stake via Phantom →** — Phantom prompts, approve
- Row appears in registry

If Phantom isn't available: point to seeded rows and explain the staking mechanics verbally.

---

### 5. Wrap (2:30–3:00)

> "Oracle is live at prooflink-five.vercel.app. Judges can query it directly — browse the passport, call the verify endpoint, check the attestations on Solana Explorer. The MCP server is running: Claude Desktop and Cursor can call verify_skill natively. Everything you saw — the x402 payment, the attestation, the validator stake — is on devnet right now."

If asked about MCP: open `/.well-known/mcp/server-card.json` in browser tab to show agent discoverability.

---

## What NOT to demo

- **Canvas ZIP parsing** — interesting feature, takes too long, judges don't care during a live pitch
- **Confidence score formula in detail** — just say "LLM-evaluated, on-chain anchored, human-validated via staking"
- **The full challenge/dispute cycle** — too slow for live demo; explain it verbally if asked ("48h window, oracle resolves by confidence threshold, challenger is slashed or wins the validator's stake")

---

## Real challenge/resolve cycle (run with a friend before submission)

To show judges a real dispute — not seeded data:

1. Friend submits their GitHub → oracle mints attestations under their wallet
2. Go to `/profile/{friend-wallet}` → click "Challenge →" on a skill card
3. Submit 0.5 SOL bond via Phantom → DB row flips to `challenged`
4. To fast-forward the 48h window (for demo purposes), run in Neon:
   ```sql
   UPDATE validation_registry
   SET challenged_at = NOW() - INTERVAL '49 hours'
   WHERE attestation_address = '<address>';
   ```
5. POST `/api/registry/resolve` → oracle checks confidence:
   - ≥70% → validator wins, resolution = `validator_wins`
   - <70% → challenger wins, resolution = `challenger_wins`
6. Row updates in the registry table — a real end-to-end dispute cycle

---

## Pre-demo checklist

- [ ] `npm start` running on port 3000
- [ ] `ngrok http 3000` running — note the URL
- [ ] Demo wallet `FLkqg6fUP39vWkcxV9ZzLKWrBjRoX2YmccLcEkobZyEZ` has seeded skills in Neon DB (verify: `GET /api/profile/FLkqg6fUP39vWkcxV9ZzLKWrBjRoX2YmccLcEkobZyEZ`)
- [ ] `pay curl` command ready to paste (with live ngrok URL)
- [ ] Phantom wallet installed, connected to devnet, devnet SOL loaded
- [ ] Vercel URL open in backup tab: https://prooflink-five.vercel.app
- [ ] At least one scan run recently so the pipeline is warm

---

## If something breaks live

| Problem | Recovery |
|---------|----------|
| GitHub scan hangs | "Pipeline takes 60-90s on cold start — let me show the pre-scanned passport" → navigate to demo wallet |
| pay.sh 402 not resolving | "Oracle needs devnet USDC — shows the payment primitive working. The 200 response is visible in the Vercel-hosted version" |
| Phantom not connecting | Skip validator demo, point to seeded registry rows and explain mechanics |
| ngrok disconnects | Fall back to `http://localhost:3000` if judges are on same network, or use Vercel URL |
