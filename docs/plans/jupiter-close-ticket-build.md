# Jupiter close-ticket safe BUILD

Workflow: 01a131a0-jupiter-close-ticket. Approved PLAN/design; no duplicate approval. Baseline 01423b81febf43c88dcc3a6d40392a39fa6be51b verified clean by BUILD owner. One review capacity / one vertical slice.

## Global constraints
User: owner of ONE existing dedicated SOL/JLP demo position. Outcome/hypothesis: one immutable owner-signed durable-nonce close packet can be encrypted, armed, restarted, triggered once, and reconciled without a second owner signature. Reference path: prepare → owner signs outside bot → arm → restart → trigger → reconcile. Owner promises no manual close/reopen while armed or pending. Offchain checks cannot exclude concurrent trading/keeper races. No race-free/production protection claim.

Critical dependency Jupiter JLP direct onchain builder; approved read-only preflight available, no fallback. Current docs-linked source 630cfd72cad499f45453a53383d7ac6d3e09e022, IDL SHA256 d879c33428655c5d68ab099664c7403adddeb24df84a05a2e7049b75e18364af. Verify bounded current official reads/docs as needed. Do not use stale closed-position fixtures or fixed offsets. API403 is optional transport limitation.

Only runnable operator CLI/bot. No frontend, global policy/counting, blanket future authority, custody, new onchain guard, venue substitution. NEVER accept owner seed/private keys. Ephemeral keys only offline/native-loopback tests. Signed packets are reusable authority: encrypt persistence, mode0700/0600, keep plaintext keys and signed bytes out of logs/argv/env/reports/history. Secrets outside worktree. Owner is nonce authority/fee payer. Pin genesis, owner/position/side, pool/custodies, recipient/mint, nonce authority/value, program identity, counter, absolutePriceBound, message hash and immutable fee budget. Use bigint/decimal U64. Bound MUST be explicit input, not entry-price-derived, quote guarantee, extreme sentinel or secretly widened slippage. SOL long receives collateral wSOL at owner-pinned ATA, no extra swap/unwrap.

Simulation failure blocks submission. One persisted intent/signature before RPC, transactional cross-process idempotency. Crash/timeouts/processed failures must survive restart and never blind resend. Changes to position/size/collateral before send conservatively invalidate. REQUEST_PENDING != CLOSED; confirmation/request disappearance/later unrelated zero position do not prove closure. CLOSED needs correlated keeper evidence, finalized zero size AND recipient outcome. Distinguish local disable, cryptographic nonce revoke, request cancel, keeper close. Unknown/pending block a new intent. New packet always new owner signature.

Live public sender default disabled; may implement protected sender but NEVER invoke public sendTransaction/deploy/trade/fund, wallet connection/signature, funded wallet import, new grant, purchase, publish, push, merge. Local disposable transactions/test funding allowed ONLY isolated native-loopback validator. Captured Jupiter handler isn't keeper; fake keeper evidence synthetic. Preserve failures and receipts. Large >10MiB ELF/ledger/caches outside watched repo; metadata check then bulk/domain operations, no full content/diffs. No global/runtime/shared source changes; only assigned worktree. Others are active, preserve their work.

## Task 1: Implement and verify the bounded ticket path

Exclusive code ownership: server/jupiterCloseTicket/{types,reader,builder,store,vault,bot}.ts and matching tests, scripts/jupiter-close-ticket.ts, migration008, docs/jupiter-close-ticket.md, minimal pinned transaction codec package/lockfile and package scripts. Keep integration minimal with existing PostgreSQL/AES-GCM patterns.

1. Follow developing-products, meaningful TDD (risk tests RED before production behavior), verification and source instructions. Install deps in assigned worktree using Node24, run bounded existing baseline checks. No secret existing .env reads or active DB/runtime connection.
2. Prepare/arm: IDL-driven account decoder/builder; explicit finite price bound; durable nonce first instruction and exact immutable bytes; reject wrong owner/signature, wallet changes, extra instructions, wrong recipient/genesis/nonce, closed/changed target. Prefer pinned minimal Solana codec; pin IDL provenance.
3. Migration/store/vault: PostgreSQL transaction locking, unique nonce-value reservation, encrypted exact packet, restart safety. Key file outside repo with strict permissions. No environment secret. Test tamper/wrong key/plaintext absence, concurrent separate processes.
4. Trigger/reconcile: atomically SUBMITTING/signature/send intent before RPC; approved event explicit input; default-disabled public sender; fail simulation before intent/send. Reconcile evidence conservatively; known processed failures never retried. Public RPC bounded read-only.
5. Native-loopback rehearsal: genuine durable nonce replay and processed-failure consumption, genuine captured Jupiter request handler where feasible. No public sends. New harness can reuse read-only previous scripts/snapshots after checking metadata/hardcoded paths and independently bind ephemeral target. No fake keeper passed as closure proof.
6. Verify npm run build, new risk tests, touched existing regressions, actual documented CLI command/restart path. Write compact safe evidence and check results; documentation/live-test envelope must name every missing owner/wallet/position, nonce setup/value/authority, recipient/mint, explicit price bound, fee/rent budget, trigger, revoke/recovery input. No invented account-specific data. Runnable safe technical delivery separate from unproven live acceptance.
7. Self-review, local commit only when fresh checks pass. Do not push/merge. Independent risk-focused review follows implementation; fix findings with failing regression tests. Preserve evidence and artifacts.

Read-only inputs:
- /Users/flydge/Documents/ChatGPT/cryptobro/research/2026-10-12-conditional-cpi/FINDINGS.md
- /Users/flydge/Documents/ChatGPT/cryptobro/research/2026-10-12-jupiter-architecture-trials/CONTRACT.md
- /Users/flydge/Documents/ChatGPT/antytilt-worktrees/jupiter-nonce-guard/experiments/jupiter/nonce_guard/managed/TESTING.md and local_rehearsal.py
- /Users/flydge/Documents/ChatGPT/cryptobro/research/2026-10-11-perps-options (bounded inspection only)

Stop after safe build/tests/doc/local commit and live proposal. New material dependency/security contradiction → concrete finding before broadening.
