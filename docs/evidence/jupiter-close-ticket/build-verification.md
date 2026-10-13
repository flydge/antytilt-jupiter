# BUILD owner verification

Scope: safe local technical delivery of one dedicated SOL Long/JLP close ticket. Full live owner/provider acceptance is open. Source baseline `01423b81febf43c88dcc3a6d40392a39fa6be51b` was clean before isolation and remains unchanged. Worktree: `/Users/flydge/Documents/ChatGPT/antytilt-worktrees/20261012-jupiter-close-ticket`; branch `flydge/jupiter-close-ticket-20261012`.

Code commits: `f634dae` implementation; `8b50c0a` review corrections. `eba0fd3` only aligns documentation with the exact approved no-manual-close/reopen constraint while ARMED/PENDING. Other detected material changes are invalidation safeguards; offchain checks do not exclude concurrent trading/keeper races.

## Fresh owner checks

Run with bundled Node24 and `DATABASE_URL`/`CREDENTIALS_ENCRYPTION_KEY` unset, using isolated test databases:

- `npm run test:jupiter-ticket`: 23 passed, zero failed/skipped. Actual PostgreSQL17 two-process claim, encrypted restart, no reclaim after uncertainty, and DISABLED-to-REVOKED observation are covered.
- `npm run build`: TypeScript app/server/CLI and Vite exit0. Existing frontend chunk-size warning remains.
- `npm run test:database`: exit0 after final code corrections.
- `test:risk-guard`, `test:risk-automation`, `test:exchange-api`, and signed-client baseline checks passed before the isolated Jupiter-only corrections; those existing code paths are unchanged by the correction commits.
- `git diff --check`: clean. Root source HEAD/status/diff hash separately rechecked.

Final independent actual CLI/native-loopback rerun:

`/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-native-wykzl0rb/receipt.json`

Size10,437 bytes; SHA256 `fd766662af255ca5c2663b46411050b83c002f39c31ff3d49bc5ff205b1aa802`.

It verifies prepare, external disposable-owner signing, encrypted arm, fresh-process restart, local disable, genuine finalized local nonce advance, observed REVOKED, a new independently signed replacement, exact loopback trigger and genuine captured Jupiter request creation. The original target stays unchanged, submitted nonce is consumed, exact signed bytes stay unchanged, repeat is refused, budget is respected, and reconciliation remains REQUEST_PENDING. Native request cost5,106,680 lamports is local fixture evidence only. Keeper absent; real SOL spent0. Task-created validator and PostgreSQL stopped. No public wallet connect/sign/send/funding/trade/deployment, push or merge occurred.

The separate genuine nonce semantics receipt is `/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-owner-nonce-440lttry/receipt.json`: processed failure consumes nonce/fee, stale changed-message replay fails. This does not prove Jupiter closure.

## Review corrections

Initial independent whole-branch review identified three Important findings. Corrections remove signatures from RPC simulation while retaining the exact message/nonce and local signature verification; require authenticated actual Jupiter positive reduction and executed payout events plus exact transfer/final state; and support read-only revocation confirmation after local disable. Test-only keeper evidence remains synthetic. Current public receipts confirm v0/ALT and split transport shapes, not this owner's closure.

The independent original review and final accepted re-review are preserved here as `risk-review.md` and `risk-re-review.md`. Final spec and quality verdicts accept the bounded safe technical slice; all three Important findings are resolved. No known Critical/Important finding is intentionally deferred.

One Minor recovery limitation is explicitly deferred: a crash/output-file failure after a PREPARED reservation can leave its public ID unprinted. Inspect the selected DB read-only for that ID, then use `status`; never delete/reset the reservation or blindly prepare/send another ticket. The current CLI does not automatically reconstruct a missing unsigned output. No signature or send intent was created in this pre-signing window.

## Concrete separate live gate

Use one existing dedicated SOL Long demo position and one owner-signed immutable ticket. Review the full public manifest; restart; trigger exactly one approved event; reconcile actual finalized correlated Jupiter reduction/payout plus same-lifecycle zero size and pinned wSOL recipient outcome. Do not manually close/reopen while ARMED/PENDING. Missing/unsupported evidence stays UNKNOWN and blocks a new intent.

Still missing: actual owner/wallet and chosen position/pool/custodies; nonce setup/account/authority/current value; existing recipient wSOL ATA; fresh genesis/program-deployment and unique counter; explicit USD6 closing floor; fee/rent/setup/funding caps; exact trigger/scenario; outside-bot wallet-signing UX; revoke and pending-request cancel/recovery procedures; accepted keeper receipt coverage; exact separate approval/expiry. These values are not invented. Wallet setup/signing, public broadcast/funding/trade and revoke/cancel remain separate authorizations. Safe technical delivery must not be described as live provider acceptance.
