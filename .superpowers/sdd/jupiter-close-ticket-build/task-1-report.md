# Task 1 implementation report

Status: safe technical delivery implemented; final independent review still belongs to BUILD owner. Operator can prepare one pinned SOL Long close packet, sign outside bot, arm encrypted bytes, restart and create one genuine Jupiter request on isolated native loopback. Provider closure and real owner acceptance remain unproved. No public send/sign/fund/deploy/trade, owner private-key import, source/shared-runtime/config mutation, push or merge occurred.

## Changes

- `server/jupiterCloseTicket/{types,builder,reader,vault,store,bot}.ts`, tests and pinned full IDL.
- `server/migrations/008_jupiter_close_tickets.sql`; encrypted prepared manifest and exact packet, immutable binding AAD, unique nonce-value reservation forever, one active target, PostgreSQL row locks and persisted SUBMITTING signature/intent before RPC.
- `scripts/jupiter-close-ticket.ts`, canonical `scripts/jupiter-close-ticket-local-rehearsal.py`, package scripts, pinned @solana/web3.js1.98.4 and bs586.0.0, and single CLI typecheck include.
- `docs/jupiter-close-ticket.md` with runnable safe operator flow, exact live inputs/approval envelope, honest recovery and proof limits; compact native/provider-shape evidence in `docs/evidence/jupiter-close-ticket/`.

One owner is signer, fee payer and nonce authority. Exactly nonce advance then docs-linked direct Jupiter close; owner wSOL ATA, explicit finite USD6 bound, no swap/unwrap/additional instructions. Borsh layouts are driven by pinned IDL. Genesis, position/owner/side/pool/custodies, token mint/authority, nonce authority/value, deployment slot, counter, original position fingerprint and immutable budgets/event are checked. Material finalized binding changes persist INVALIDATED; transient transport gaps leave ARMED and block intent.

Public send is disabled by default. Protected public code is present only behind exact expiring reviewed authorization-envelope file, with synthetic transport tests; never invoked publicly. Local test send is exact127.0.0.1 HTTP plus explicit flag. Simulation failure precedes intent and submission. Pending/unknown/consumed states never blind resend; new bytes require new owner signature.

Reconcile distinguishes request creation from closure. Current read-only provider shape check found v0/ALT standalone `closePositionRequest2`; therefore decoder handles v0 resolved keys from finalized RPC metadata and separate ordered decrease+payout receipts. CLOSED additionally requires exact request+target+custody correlation, a positive inner SPL transfer from request ATA to pinned owner ATA authorized by request PDA under close, positive recipient token balance outcome, and same-position finalized zero size. CPI-only top-level Jupiter evidence, deleted Position, zero payout and missing metadata conservatively remain UNKNOWN. No synthetic keeper test is provider acceptance.

## TDD and checks

Initial safety RED:5 failing assertions on missing prepare/signature validator, vault, reconciliation and sender. Subsequent REDs captured missing IDL decoder/read-only RPC, trigger/store contracts, wrong Position PDA acceptance, disabled sender persisting intent, missing derived request/ATA occupancy, definitive target change not persisting invalidation, missing protected public sender, full current Pool/Custody u32/f32 decode, arm simulating before owner-signature validation, v0/ALT+split receipt rejection, and unrelated recipient balance accepted as payout evidence. Each corresponding behavior was implemented/changed and returned GREEN. Provider receipt correlation has supplementary synthetic metadata tests; historical public Position decoder fixture is not an armable live position.

The initial instruction literal was corrected after independently checking captured direct legacy discriminator4ac6c356c163014f;2e17... was a different newer API instruction. Native attempt1 enforced its RPC body bound while reading full ProgramData; harness changed to13-byte header. Native attempt2 exposed missing current u32/f32 layouts; reproducing full Pool/Custody decoder test failed before adding those primitive decoders. All failure packets, ledgers and logs remain external and preserved.

Safe commands run in `/Users/flydge/Documents/ChatGPT/antytilt-worktrees/20261012-jupiter-close-ticket` with bundled Node24 PATH:

| Command | Evidence |
| --- | --- |
| `npm ci --ignore-scripts`; pinned codec installs | isolated worktree only; no package install scripts |
| `npm run test:jupiter-ticket` | final suite19/19 incl native PostgreSQL17 encryption/restart, unique nonce+position, DB tamper and two separate process claimants: one CLAIMED, one REFUSED |
| `npm run test:database` | existing PostgreSQL isolation/encryption/durable RM pass; migration008 compatible with pg-mem regression |
| `npm run test:risk-guard` | existing risk-guard pass |
| `npm run test:risk-automation` | existing risk automation pass |
| `npm run test:exchange-api` | existing exchange API integration pass; intentional cancellation-failure negative logs |
| `npm run build` | TypeScript app+server+new CLI and Vite build pass; existing>500kB bundle warning |
| separate strict CLI `tsc --ignoreConfig --noEmit ... scripts/jupiter-close-ticket.ts` | pass; CLI then explicitly added to normal build include |
| actual `npm run jupiter:ticket -- help` | documented operator command pass |
| venv `python -B scripts/jupiter-close-ticket-local-rehearsal.py` | safe native operator acceptance passed; parent independent exact canonical rerun passed at `/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-native-415nnj1c/receipt.json` |

Latest native operator receipt (before canonical path rename, identical executable flow): `/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-native-tejxnw0w/receipt.json`. Compact manifest records byte size/SHA256 and original successful/failing receipts. Earlier successful receipt `/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-native-sbw4004j/receipt.json`, SHA256a8b39f54ad0e205d7e8ac71a055ba40baf96529172666d3391f0060a42ee9730. Native actual owner cost5,106,680 lamports within pinned fee5000+rent8,000,000 cap; genuine handler request created, submitted nonce consumed, exact signed packet stable, original synthetic position hash unchanged, reconcileREQUEST_PENDING, repeat refused, both processes stopped, keeper absent, real SOL0. Owner sign exists only in outside-bot Python throwaway loopback fixture; no real wallet key was accepted.

Independent owner's native nonce semantics receipt is separately hashed in manifest: `/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-owner-nonce-440lttry/receipt.json`. It supports processed-failure fee+nonce consumption and stale changed-message refusal, not Jupiter keeper outcome.

Read-only public receipt-shape evidence canonical copy: `docs/evidence/jupiter-close-ticket/provider-shape-20261012.json`, four finalized program samples at slots456176663–456176683. Two successful v0 receipts contain standalone closePositionRequest2; one uses14 loaded addresses. This only establishes transport/receipt shape. No user-specific closure inferred.

## Self-review and limits

- Exact signature/message validation occurs locally before RPC simulation. No owner key or signed bytes go in argv, env, output, report or Git. Key/packet/config checks require external owned restrictive files. AES-GCM detects context/key/tamper errors. Prepared manifest itself is encrypted/authenticated, protecting offchain budget/event/genesis metadata edits during restart.
- Owner reviews full public binding in prepare/status. Fee/rent/event/genesis/fingerprint checks are authenticated offchain policy, not cryptographic transaction assertions. Signed message binds actual owner/nonce/program accounts/recipient/counter/price bound. Fresh owner signature remains required for new bytes.
- PG int8 parser sharedNumber conversion is avoided: U64 values are decimal strings inside authenticated JSON. Store has independent explicitly configured pool and no active runtime DB/env reads. Actual PostgreSQL cross-process locks are tested, not claimed from pg-mem.
- Sender and state checks precede claim; exactly one transactional claim wins. Claim→crash stays SUBMITTING and never resends. Disabled sender leaves ARMED. Timeouts and missing final evidence stay UNKNOWN; no status reset facility.
- Offchain snapshots cannot prevent simultaneous outside trading/keeper races. The exact approved owner promise is no manual close/reopen while ARMED or PENDING. Detected size/collateral/material changes before submission conservatively invalidate as safeguards, not additional owner obligations; no race-free pending or future-position protection claim.
- Dependency audit: existing repository has high/critical advisories in unrelated shell-quote/proxy-addr/source-map-js chains. Pinned web3 adds moderate jayson/stream-json/uuid advisory chains; this slice uses codecs only and implements its own bounded RPC, never web3 Connection/Jayson RPC. No unrelated dependency upgrade was performed. Full npm audit is not claimed clean.
- Native tool binary65,105,408 bytes and captured Jupiter ELF10,485,715 bytes inspected with metadata, streamed hash/read-only reuse; all ledger/cache/packets/keys external. No large add/move/diff in watched worktree.
- Evidence is safe technical delivery. Public owner UX/signature, account-specific budgets/nonce setup, provider acceptance and keeper zero-position/payout remain live gates.

Missing live envelope inputs: actual owner wallet and existing dedicated SOL Long target; correct JLP/SOL custody and recipient ATA/mint; nonce setup account/current value/owner authority and independent revoke/recovery; verified genesis/program deployment; new request counter; explicit finite USD6 minimum price; immutable fee/rent/setup/funding budgets; exact trigger event/scenario; no manual close/reopen while ARMED or PENDING; actual outside-bot wallet-signing UX; provider receipt and cancellation/recovery acceptance; exact live-action approval reference/expiry. None are invented or authorized by this safe build.

Local commit is allowed after fresh checks; commit SHA is returned to owner. Parent owns independent risk review and final BUILD acceptance. No push/merge.


## Independent review fix round1 (supersedes initial positive evidence predicate)

Original commitf634dae independently reviewed: three Important findings accepted, one Minor deferred by owner. Original risk-review.md is preserved and not changed by implementation.

F1: fully signed reusable nonce packet was being sent during simulation before event/intent. RED captured real arm/trigger HTTP requests (`sigVerify=true`, owner signature present). Current simulation validates locally, clears ALL signatures, serializes identical message with original nonce, and uses sigVerify=false/replaceRecentBlockhash=false. Real HTTP body regression proves no usable owner signature or original signed packet is disclosed. Post-claim actual sender receives original exact valid bytes only.

F2: instruction presence+payout+later zero formerly passed without actual reduction proof. RED reproduced that insufficiency and wrong-event positives. Current CLOSED predicate additionally requires Jupiter self-CPI event data from the matched outer instruction: actual program ID, event-authority PDA, stackHeight2 and observed Anchor event-CPI tag. Pinned IDL DecreasePositionEvent must match exact target/owner/pool/custodies/mints/request/lifecycle/open time/price bound and a positive delta equal to original full size. ClosePositionRequestEvent must say executed=true, entirePosition=true and match request/owner/mint/side/change/type plus amount exactly matching positive request-ATA SPL transfer. Same-transaction decrease must precede payout; split receipts must occupy strictly ordered slots. Missing/spoofed/zero/partial/unexecuted/mismatched events reject. Event.positionSizeUsd is not assumed to be post-zero; same-lifecycle finalized zero remains independent required evidence. Pinned known fields are decoded with bounded appended data ignored, supplying no evidence.

Official read-only real close receipt showed a Jupiter self-CPI event tag/event-authority/stackHeight2 and no event logs. Its event was unexecuted (not provider reduction proof); canonical metadata-only shape copy is docs/evidence/jupiter-close-ticket/provider-event-shape-20261012.json. This observation plus Anchor primary documentation establishes framing, not live closure acceptance. Positive event/receipt tests remain synthetic contract evidence.

F3: actual persisted PG regression initially failed on unused DISABLED confirmation. ARMED or DISABLED with NULL intent event/time may now observe finalized changed nonce and become REVOKED; store rechecks no-intent constraint under row lock. Unchanged nonce/pending prior intent reject; no re-enable/resend path. Canonical native harness exercises real local owner nonce advance after disable, confirm-revoke, and a fresh new nonce/counter/owner signature for separate final request.

Current checks:23/23 ticket tests, npm run build including CLI, npm run test:database and git diff --check pass. Canonical native command `venv/bin/python -B scripts/jupiter-close-ticket-local-rehearsal.py` passed at /var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-native-wtoxvs6e/receipt.json, SHA25649c000db56bd98018f44e738e4dad0f50c0c11b96a5c2cfb89e8276bfca4c110. Both native validator and PostgreSQL stopped; real SOL0, keeper absent; signature-stripped simulation still reaches genuine handler; recovery DISABLED→REVOKED passes; fresh packet nonce consumed and request created, unchanged synthetic position, REQUEST_PENDING. Exact request creation cost remains5,106,680 lamports within immutable cap. All prior receipts/failed artifacts preserved externally.

Deferred Minor: possible orphan PREPARED reservation after unsigned-output write failure/crash; root will triage/document. No unsafe reset/recovery capability introduced. Live owner/provider/keeper acceptance, external race limitations, deleted-position/CPI-only/zero-payout/same-slot-split coverage remain open. Current correction delta awaits independent owner/reviewer check; safe technical delivery only.
