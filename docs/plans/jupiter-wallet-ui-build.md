# Jupiter wallet UI implementation plan

Approved continuation 1 of 01a131a0-jupiter-close-ticket. Existing PLAN handoff remains authoritative.

**Goal:** Existing AntyTILT account drawer connects a compatible owner wallet, verifies ownership, discovers one existing SOL Long, reviews and signs an exact deferred close ticket, restores encrypted ARMED state and submits once on the reviewed manual trigger.
**Architecture:** React panel and session-bound API over existing ticket reader/store/bot. Dedicated nonce/ATA setup is a separate owner-reviewed transaction. No owner keys, public wallet actions, shared runtime changes or keeper closure claims by the agent.
**Review capacity:** One batch; root owns integration, independent security review before acceptance.
**Reference lock:** Existing styles.css and ExchangeConnectionModal; Inter, current dark/light semantic tokens, compact controls and thin dividers. Family flow6199 owns network/recipient/fee review sequence only.

- [x] Exact checkpoint/source fingerprint and isolated worktree.
- [x] Actual Chrome Phantom capability page: connect/signMessage/signTransaction available; no invocation.
- [x] Session CSRF, one-use five-minute ownership proof and cross-user tests.
- [x] Server-derived position/setup/budget discovery, atomic ticket ownership/reservation and lost-response recovery tests.
- [x] React connect→verify→discover→setup/review→sign-only→arm, stale account responses and modified-packet tests.
- [x] Persist reviewed expiry/trigger envelope, reconcile bounded receipts; strict CLOSED proof remains fail-closed.
- [x] Isolated PostgreSQL/native validator and clearly labelled Native rehearsal wallet browser walkthrough; API restart, request pending and unused revoke.
- [x] Independent security review, affected regressions/build, running URL and owner acceptance packet.

Native success is REQUEST_PENDING; CLOSED requires genuine finalized keeper proof. Live owner inputs and exact actions are obtained in UI, no seed/address/config in chat. Disconnect does not disable or revoke a ticket. UNKNOWN never permits resend.

Safe delivery/native browser gate complete. Live owner/provider acceptance remains open and requires owner-controlled actions at the running mainnet UI.
