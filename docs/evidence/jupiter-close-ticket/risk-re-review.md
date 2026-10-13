# Independent risk re-review and bounded acceptance

Initial whole-branch review: `01423b81febf43c88dcc3a6d40392a39fa6be51b..f634daea0c648a85847e27636d319d89ffce2ebf`, preserved in `risk-review.md`.

Correction delta reviewed: `f634daea0c648a85847e27636d319d89ffce2ebf..8b50c0a47a0868775a9fee8e3e073595ad3d1ffc`; packaged diff64,389 bytes. Also inspected documentation-only successor `eba0fd33e212291538f25725da8e08684f894425`: source code is unchanged, and the owner promise is restored to exactly no manual close/reopen while ARMED or PENDING. Changes detected before send remain conservative safeguards rather than a new owner obligation.

Worktree: `/Users/flydge/Documents/ChatGPT/antytilt-worktrees/20261012-jupiter-close-ticket`. Review remained read-only except this report. No public mutations, secret inspection, subagents, source/index/branch edits or redundant test-suite runs occurred.

## Verdict

**Spec compliance: acceptable for the approved bounded safe technical BUILD. F1, F2 and F3 are resolved. No open Critical or Important finding was established in the correction delta or the final state assessed against the original whole-branch review.**

**Code quality: acceptable for this slice.** The fixes retain exact immutable message/packet handling, persisted transactional send intent, conservative reconciliation, isolated operator storage and default-disabled public submission. Correction tests target actual authority boundaries, event context and persisted recovery rather than implementation mirroring.

This accepts safe technical delivery to genuine local Jupiter request creation/REQUEST_PENDING, with the independently verified owner checks below. It does not accept public owner-wallet UX, funded venue operation, provider fulfillment or keeper CLOSED. The orphan PREPARED output/reservation limitation remains a non-blocking Minor, explicitly triaged below and now visible in the operator guide's recovery section.

## Resolution of the three Important findings

| Finding | Status | Inspected resolution |
| --- | --- | --- |
| F1: simulation disclosed executable signed authority before intent | Resolved | `reader.ts:445-477` verifies signatures locally, clears every signature slot, serializes with missing signatures allowed, checks the unchanged message, and uses `sigVerify=false` with the original nonce and `replaceRecentBlockhash=false`. `bot.ts:433-440` still validates exact immutable owner signature before arm simulation. Trigger decrypts/validates the exact packet, performs non-authorizing simulation, commits claim, then sends the untouched original bytes at `bot.ts:455-469`. Simulation failure still precedes intent. |
| F2: instruction presence lacked actual decrease/executed payout evidence | Resolved | `bot.ts:263-354` requires instruction-bound Jupiter self-CPI events, a positive delta equal to the original full size, exact target/request/lifecycle/price/custodies/mints/owner/pool, and an executed entire-position close. `bot.ts:370-413` requires an actual positive request-ATA-to-recipient SPL transfer whose amount matches the close event and a positive recipient balance outcome. The unchanged reconcile gate at `bot.ts:568-594` additionally requires successful finalized submission, ordered receipt/finalized observations, the same lifecycle's finalized zero and valid pinned recipient. |
| F3: DISABLED ticket could not record nonce revocation | Resolved | `bot.ts:603-633` accepts unused ARMED or DISABLED with NULL intent time/event, observes the pinned genesis and finalized changed nonce, then records REVOKED. `store.ts:154-175` narrowly permits DISABLED→REVOKED and rechecks absence of intent under the row lock. No re-enable/resend or pending-state bypass was added. |

### F1 authority and failure checks

Inspected `simulation.test.ts:10-95`: it captures actual loopback HTTP bodies from arm and pre-intent trigger, checks every parsed signature is NULL/unusable, exact message and nonce equality, absence of the original signature/packet, and original valid bytes arriving at the sender only after claim. The existing exact-message/wrong-signature-before-RPC and failed-simulation-before-intent checks remain applicable. The original packet is not modified by constructing the simulation copy.

The root's independently rerun native handler path passed after this change, so non-authorizing nonce simulation is not merely an HTTP-mock claim. No public signed packet was submitted during this review or native evidence.

### F2 event provenance, correlation and refusal checks

`actualEvent()` accepts only inner instructions in the exact matched outer Jupiter instruction's group, addressed to the real Jupiter program, with stackHeight2, the one exact event-authority PDA account, bounded base58 data and the Anchor self-CPI tag. `reader.ts:171-185` verifies the named event discriminator and decodes pinned IDL fields with bounded appended bytes supplying no evidence. Arbitrary log text and nested foreign-program event lookalikes are not accepted.

This framing is consistent with [Anchor's primary event-CPI documentation](https://www.anchor-lang.com/docs/features/events), which describes self-CPI event bytes fetched from transaction inner instructions. The repository's public `provider-event-shape-20261012.json` independently records the Jupiter program/event-authority/depth/tag framing. That sample is an unexecuted close and is not positive reduction or live closure acceptance.

Selected pinned enum definitions confirm Market0, Decrease2 and Long1. The positive reduction checks bind the original `positionOpenTime`, full original decimal size and bound, not only reusable request/position addresses. The close must say executed and entire-position, and its amount must equal the actual pinned SPL transfer. `positionSizeUsd` event semantics are not guessed to mean post-zero; finalized same-lifecycle zero remains independently required.

Within one transaction the decrease instruction must precede payout. Separate receipts require strictly increasing slots; same-slot split receipts lack an ordering proof and conservatively remain UNKNOWN. v0/ALT keys still come only from finalized transaction metadata. Missing, malformed, missing-origin, zero/partial-delta, wrong-lifecycle/request/owner/bound, unexecuted/non-entire/mismatched-amount, unrelated-transfer and impossible-ordering evidence cannot satisfy the current predicate. Relevant cases are explicitly exercised in `reconciliation.test.ts:215-424`; the formerly unsafe no-event legacy case in `bot.test.ts` now expects false.

Positive event/receipt tests remain synthetic contract evidence. CPI-only outer shapes, removed Position accounts, zero payout, missing event metadata and same-slot split coverage remain honest UNKNOWN limitations. None has been silently accepted as an alternate closure proof or new product scope.

### F3 persistence, restart and revocation checks

The actual PostgreSQL integration extension at `store.integration.test.ts:128-171` persists ARMED→DISABLED, refuses unchanged nonce, then persists observed REVOKED with NULL intent, refuses another claim and rejects prior pending intent. The store performs the decisive state/no-intent check under its existing transaction lock, so an observation racing a claim cannot revoke a SUBMITTING ticket through this transition.

The canonical native harness extension performs a genuine ephemeral-owner local nonce advance after disable, confirms REVOKED through the CLI, refuses its trigger, and then creates a separate fresh nonce/counter and outside-bot signature for the genuine request-creation path. Owner nonce advance, local disable and provider request cancellation remain distinct; there is no new public revoke/send action.

## Fresh verification evidence and limits

Root reported fresh post-fix `test:jupiter-ticket`23/23, complete app/server/CLI/Vite build and database regression exit0. The root performed the native canonical command independently; this reviewer inspected selected public receipt fields and verified its byte count/hash instead of rerunning suites or loading signed packets.

- Root receipt: `/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-native-wykzl0rb/receipt.json`.
- Size10,437 bytes; SHA256 `fd766662af255ca5c2663b46411050b83c002f39c31ff3d49bc5ff205b1aa802` independently matched.
- Inspected fields: `NATIVE_OPERATOR_REQUEST_PENDING_PASSED`; recovery_disabled/recovery_revoked true; consumed nonce, created request, unchanged position and exact signed file bytes; immutable budget respected; actual creation cost5,106,680 lamports; realSOL0; keeper absent; validator stopped; final statusREQUEST_PENDING. Root separately reported PostgreSQL stopped.
- Implementer's earlier correction receipt size10,438 and hash `49c000db56bd98018f44e738e4dad0f50c0c11b96a5c2cfb89e8276bfca4c110` were also independently checked and showed the same bounded outcome.

These results corroborate the executable CLI and correction behavior at the safe native gate. They do not prove keeper operation, public wallet signing/approval, public RPC fulfillment or production/race-free protection. Public sender remains default-disabled and was not publicly invoked. New packet authority still requires a new outside-bot owner signature.

## Minor orphan PREPARED reservation: independent triage

The original finding at `scripts/jupiter-close-ticket.ts:181-188` remains: DB INSERT can commit before unsigned-output write or ID stdout. File conflict/write error/crash can leave a PREPARED reservation without a usable CLI-visible ID, and uniqueness safely prevents blind retry. There is no built-in lookup/export/recovery command for that failure window.

**Non-blocking for this safe delivery, on independent risk assessment.** This affects availability/recovery before arming. The reservation itself creates no owner signature, stores no signed packet, has no send intent, and cannot trigger through the CLI. It does not bypass the nonce, active-position or immutable-authority controls and does not turn uncertainty into permission to resend. The approved reference path's restart gate is after arm; claiming complete crash recovery at every prepare/output window would be too strong.

The limitation must remain explicit: after a prepare write/crash failure, do not repeatedly prepare, reset/delete nonce reservations or guess a new ticket. A maintainer may identify the existing public ticket ID in the explicitly selected DB, verify it through authenticated status and use a supported safe local disable path if abandoning that preparation. Recovering/exporting the exact original prepared message lacks a dedicated CLI path and may require maintainer assistance. No signed bytes/keys should be moved into logs/argv/history during recovery. Before this report was finalized, the owner added the disclosure at `docs/jupiter-close-ticket.md:80`; that exact paragraph was inspected and accurately describes read-only ID recovery, no automatic unsigned reconstruction and no blind reservation reset. Deferral is acceptable with this disclosure, not a claim the recovery defect is fixed.

## Final whole-branch assessment

The prior full-branch review's non-finding conclusions remain intact: one pinned SOL Long/wSOL target; nonce-first exact message; explicit finite USD6 floor; owner ATA and outside-bot signature; encrypted exact packet/manifest and restrictive external files; U64 strings; one cross-process persisted intent; failed simulation before intent; no blind retry after crash/timeouts/processed failure; definite detected target changes invalidate while uncertain reads block; REQUEST_PENDING distinct from CLOSED; no UI/global-policy/guard/venue expansion; bounded isolated artifacts; local-only commits with public/live authorization still separate.

The previously blocking authority/evidence/recovery defects are now corrected without weakening those constraints. The code and inspected recovery disclosure are acceptable for the approved safe technical batch; the owner still performs the final local documentation/report integration commit. Live owner/provider/keeper gates and documented coverage/recovery limitations remain open rather than inferred from green tests or review.

Stop condition met: scoped delta re-review and final bounded safety/spec/quality assessment complete; no correction code was written by this reviewer.
