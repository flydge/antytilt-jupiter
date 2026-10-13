# Jupiter wallet / UI slice

The existing AntyTILT account drawer has a separate **Jupiter wallet** tab. BingX remains its own execution account. The owner can verify a traditional Phantom wallet, discover a dedicated existing SOL Long/wSOL position, review a separate nonce/recipient setup, sign one close ticket without sending, restore encrypted ARMED state, then approve one manual trigger without a second transaction signature. The UI distinguishes REQUEST_PENDING, UNKNOWN and strict CLOSED.

**Evidence ceiling:** The real Chrome native rehearsal reached REQUEST_PENDING through the actual captured Jupiter handler. Its position is synthetic, wallet disposable, real SOL spent zero, and no keeper exists. The mainnet UI is running and Phantom sign-only methods plus public Jupiter reads are available; live owner signing, durable-nonce wallet UX and genuine keeper closure remain unaccepted.

## Open the actual app

- Mainnet owner surface: <http://127.0.0.1:15974/>. Open **Connect exchange → Jupiter wallet → Connect & verify Phantom**. The agent has not pressed that button. The owner performs every wallet approval, setup send and explicit close trigger personally.
- Native evidence surface: <http://127.0.0.1:15973/>. Its pending demo request remains preserved; the unused prior ticket is REVOKED.
- The task-local app account is `native-rehearsal@antytilt.local`, password `Native-rehearsal-only-20261012`. These are disposable local test credentials, unrelated to exchange/wallet credentials. The same existing app auth cookie is accepted on the two task-owned loopback ports; wallet proofs are separately bound to each exact origin and genesis. A person can create their own local app account instead.

No wallet address, seed, ticket ID, nonce seed, keeper signature or RPC configuration must be entered in chat or the product form. After owner verification, the server discovers the position and derives all accounts. Missing positions show an honest empty state; the app never opens one automatically. The price floor is blank until explicitly entered. Fee/rent quotes are current RPC quotes, independently bounded again before arm/send. No current-price or payout estimate is invented.

## Security / recovery

Five-minute Ed25519 ownership challenges bind the app session, owner, exact origin/URI, chain genesis, nonce, issue/expiry time and request ID. Atomic consumption rejects replay. Disconnect consumes pending proofs and clears app verification, while preserving CSRF. Every mutation requires app auth, exact Origin and session CSRF; every ticket/action also checks the verified wallet and app user. Legacy CLI tickets have no UI ownership and are not exposed.

Prepare reserves the exact nonce value and inserts ticket ownership in one PostgreSQL transaction. A lost response is recovered from the owner's list or the same client request ID. Active tickets sort before bounded history. Signed packet persistence and its expiring exact authorization envelope commit atomically. The envelope and UI review are authenticated with the external AES-GCM vault key; changing an expiry or swapping reviews is refused. No signed packet appears in status, logs, reports or browser storage. Wallet-altered instructions/messages are rejected, never repaired. RPC simulation receives an unsigned identical message after local signature validation.

Dedicated nonce setup uses create-with-seed and owner-controlled authority; no generated account private key is retained. Owner wSOL ATA creation is a separate setup instruction/transaction. Setup/revoke previews are authenticated at rest and signatures remain transient. A send intent and exact signature precede one RPC send. Lost/unknown setup results are reconciled; a missing signature plus finalized recent-blockhash expiry permits a **new unsigned review**, while preserving the old intent/signature. The old signed packet is never resent. Deferred close tickets retain the stricter durable-nonce no-resend rule.

Disconnect, local disable and cryptographic nonce revocation are distinct. An unused ticket can be disabled, then the owner signs/sends a separate nonce advance and the server observes REVOKED. A pending Jupiter request is not cancelled by advancing a nonce. Pending request cancellation is a separate owner action; this UI offers no reset/re-enable or cancellation promise.

CLOSED still requires finalized submission, same-lifecycle zero position, instruction-bound genuine Jupiter self-CPI full-size reduction and executed entire-close events, and an exact positive requestATA→ownerATA payout. v0/ALT and split receipts are supported. Same-slot splits require finalized block signature ordering; unavailable ordering remains a coverage gap. The UI auto-searches bounded correlated receipts; the owner never enters keeper signatures. Synthetic closure shape tests do not establish keeper acceptance.

## Reproduce native browser evidence

Use Node24, the existing PostgreSQL17/Solana/native Python tools documented in the older CLI harness, and the assigned checkout. Dependency caches, ledger, DB, vault and disposable keys stay outside the checkout.

1. Run `scripts/jupiter-wallet-ui-native-runtime.py` with the native Python environment. It creates an isolated runtime and prints its small external manifest path. It binds frontend15973/API15980/RPC19980 and stops only its own children on SIGTERM.
2. In real Chrome, use the existing local app login and Jupiter tab; **Native rehearsal wallet** signs only registered app challenges and exact registered unsigned action/ticket messages. Its test signer routes are mounted exclusively by `scripts/jupiter-wallet-ui-native-api.ts`, never the normal API.
3. Review/send setup; check finalized readiness; explicitly enter USD150 for the synthetic fixture; review/sign without sending; observe ARMED.
4. Stop the task supervisor cleanly and restart with `--resume <manifest>`. It preserves the ledger, DB, vault and signed authority. Refresh the drawer and observe the same ARMED ticket. No reset/delete is used for recovery.
5. Disable the unused ticket; review/sign/send its nonce advance; check REVOKED. Reconnect the test wallet as needed and prepare a fresh replacement ticket with the advanced nonce. Sign and arm it.
6. Collect `before` evidence using `scripts/jupiter-wallet-ui-collect-evidence.ts <manifest> before`. Use the visible checkbox/button to trigger once, then reconcile finalized status. Collect `after` evidence. Compare ticket/message/packet identity, unchanged position, consumed nonce, genuine request creation and unchanged transaction-signature counter.

`scripts/jupiter-wallet-ui-walkthrough.mjs` supplies bounded visible phases through the documented cua_repl Tab API. It refuses any other origin or an owner-wallet surface. It does not start another browser technology or automate a live wallet. Login and finality observations remain explicit; the recorded gate in this task used real Chrome/CUA.

The mainnet preview uses normal `server/api.ts`, server-only private configuration and the same isolated app PostgreSQL. It has no native signing routes. Configuration fixes the RPC/genesis/origin/mode/key file; the client cannot supply a sender flag, endpoint or approval reference. Public send is reached only after an owner wallet signature and explicit exact trigger review. Do not run this experiment with a position being manually closed/reopened while ARMED or PENDING; other detected changes invalidate the ticket, but simultaneous trading races remain possible.

## Runtime / rollback

The external `runtime.json` and `live-runtime.json` record exact task-owned PIDs/ports. Stop the live preview supervisor first, then the native supervisor if shutting down both. Keep the external vault/DB/ledger/evidence recoverable. Restart does not reset pending authority. Never kill another app's services or change canonical source/main.

The branch is local and unpushed. No deployment, merge, purchase, real wallet connect/sign/setup/funding/trade/public broadcast has been performed by the agent. Live acceptance remains an owner-controlled gate.

Primary interfaces: [Phantom traditional sign-only method](https://docs.phantom.com/solana/sending-a-transaction), [SIWS verification source](https://github.com/anza-xyz/wallet-standard/blob/master/packages/core/util/src/signIn.ts), existing pinned Jupiter IDL and ticket contract.
