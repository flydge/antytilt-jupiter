# One Jupiter SOL close ticket

The operator can prepare one immutable close request, have its owner sign outside the bot, encrypt and arm it, restart, then trigger the exact bytes once. Actual operator CLI acceptance is demonstrated against a native loopback validator with the captured Jupiter handler and an isolated PostgreSQL database. The observed end state is **REQUEST_PENDING**, not CLOSED. A keeper, real owner wallet UX and live provider fulfillment are still unproved.

This path supports a dedicated existing **SOL Long / wSOL collateral** position. The recipient is its owner's pinned wSOL ATA; no swap, unwrap, transfer or arbitrary instructions are appended. Owner equals fee payer and nonce authority. The approved owner promise is no manual close/reopen of the dedicated position while ARMED or PENDING. Before submission, detected size, collateral or other material position changes conservatively invalidate the ticket. These checks are safeguards, not additional owner obligations; they cannot exclude simultaneous external trading or keeper races or guarantee race-free protection while pending.

## Public contract and sources

The exact transaction contains nonce advance first and `createDecreasePositionMarketRequest` second. It has one owner signature, `entirePosition=true`, zero deltas, no referral, and an explicit operator-supplied absolute closing-price bound in **USD with six decimal places** (`150000000` means USD150). This is a minimum acceptable closing price for a Long, not an entry-price-derived value or guaranteed quote. Zero and max-U64 sentinel bounds are rejected. Decimal U64 strings retain precision; JS numeric inputs, scientific notation and silent slippage widening are rejected.

The pinned docs-linked [Jupiter developer source](https://github.com/julianfssen/jupiter-perps-anchor-idl-parsing/blob/630cfd72cad499f45453a53383d7ac6d3e09e022/src/examples/create-market-trade-request.ts) commit is `630cfd72cad499f45453a53383d7ac6d3e09e022`; `server/jupiterCloseTicket/idl.json` has SHA256 `d879c33428655c5d68ab099664c7403adddeb24df84a05a2e7049b75e18364af`. Account layouts and instruction parameters come from that IDL, not copied offsets. The program ID is `PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu`. Reads pin genesis, executable upgradeable-program identity and its deployment slot. A detected upgrade invalidates the ticket. This deployment pin does not independently authenticate a public RPC provider's account responses.

[Solana durable nonces](https://solana.com/docs/core/transactions/durable-nonces) can be consumed by processed execution failure as well as success. A crash or timeout after intent is never treated as permission to resend.

## Storage and authorization

The CLI does not read `.env`, environment secrets, existing app runtime config, an owner seed or a private owner key. Select PostgreSQL explicitly using a private config file. The native tests create their own external PostgreSQL17 cluster; no existing app database is used. `008_jupiter_close_tickets.sql` also remains compatible with existing repository migrations.

Use a private directory outside the worktree, owned by the operator with mode0700. Config, binding, signed packet, unsigned output and raw32-byte vault key files require mode0600; symlink key/packet files are refused. Create a new vault key with `init-key`; keep a recoverable private backup. The bot's vault key is not a wallet key.

Both prepared metadata and the exact signed packet are encrypted with AES-256-GCM. The packet AAD includes ticket ID and full immutable prepared manifest hash, so stored fee/rent cap, trigger, genesis, owner, recipient and nonce edits cannot silently widen authorization during arm/restart. The nonce-value reservation is unique forever. A partial unique index prevents a second active ticket for the same genesis/owner/position. Row locks atomically persist SUBMITTING, the exact signature, trigger event and timestamp before any RPC send.

Genesis, trigger, fee/rent caps and original position fingerprint are **offchain authenticated operator checks**, not assertions enforced by the owner's Solana signature. Owner, nonce advance, recent nonce value, Jupiter accounts, counter, recipient and absolute bound are cryptographically covered by the signed message. Owner reviews the complete public binding displayed by `prepare`/`status` before signing. Exported unsigned bytes are never mutated after review. A new packet requires a new owner signature.

The fee quote must fit the explicit fee cap; conservative rent for a512-byte request plus165-byte token ATA must fit the explicit rent cap. These caps are immutable policy inputs and never automatically increased. Actual native cost was5,106,680 lamports, within fee5000+rent8,000,000. This bounds the tested request-creation fixture; it does not promise future keeper costs, network pricing or successful fulfillment.

## Operator commands

Run from the dedicated checkout with Node24. Only the **paths** below go in argv; keys and signed bytes never do. `$PRIVATE` here names an operator-created external private directory, not a secret value.

```sh
export PATH='/Users/flydge/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:'"$PATH"
npm run jupiter:ticket -- init-key --key-file "$PRIVATE/vault.key"
npm run jupiter:ticket -- prepare --config "$PRIVATE/config.json" --binding "$PRIVATE/binding.json" --unsigned "$PRIVATE/unsigned.bin"
# Review prepare/status's complete public binding and message hash.
# Owner signs unsigned.bin in their external wallet; save signed.bin privately.
npm run jupiter:ticket -- arm --config "$PRIVATE/config.json" --id "$TICKET_ID" --packet "$PRIVATE/signed.bin"
npm run jupiter:ticket -- status --config "$PRIVATE/config.json" --id "$TICKET_ID"
npm run jupiter:ticket -- trigger --config "$PRIVATE/config.json" --id "$TICKET_ID" --event "$EXACT_APPROVED_EVENT"
# The command above is refused with SENDER_DISABLED; state remains ARMED.
npm run jupiter:ticket -- reconcile --config "$PRIVATE/config.json" --id "$TICKET_ID"
npm run jupiter:ticket -- disable --config "$PRIVATE/config.json" --id "$TICKET_ID"
# After the OWNER separately advances the nonce through their wallet:
npm run jupiter:ticket -- confirm-revoke --config "$PRIVATE/config.json" --id "$TICKET_ID"
```

Private config shape: `{"rpc":"<explicit endpoint>","database":{"host":"<selected PostgreSQL host>","port":5432,"user":"<selected user>","database":"<selected database>"},"keyFile":"<external vault key path>"}`. If needed, DB credentials belong in that private config file. Host/port/user/database are all required, avoiding pg environment fallback. No owner key belongs in any input.

`binding.json` requires exactly these public fields. All account-specific fields remain missing for a live run; do not reuse the native fixture's identities or genesis:

```json
{
  "genesis": "<verified chain genesis>",
  "owner": "<owner wallet public key>",
  "position": "<dedicated existing SOL Long position PDA>",
  "pool": "<JLP pool>",
  "custody": "<SOL custody>",
  "collateralCustody": "<same SOL custody>",
  "side": "Long",
  "mint": "So11111111111111111111111111111111111111112",
  "recipient": "<owner wSOL ATA>",
  "nonce": "<dedicated initialized nonce account>",
  "nonceAuthority": "<same owner public key>",
  "nonceValue": "<verified current durable nonce value>",
  "counter": "<new canonical decimal U64 counter>",
  "absolutePriceBound": "<explicit finite USD6 bound>",
  "maxFeeLamports": "<explicit fee cap>",
  "maxRentLamports": "<explicit rent cap>",
  "triggerEvent": "<exact reviewed event identifier>",
  "programDeployment": "<verified Jupiter ProgramData deployment slot>"
}
```

Prepare derives the current finalized position fingerprint, size, collateral, open time and observed slot; checks pool/custodies, recipient token owner/mint, nonce value/authority, pending-request coverage, and vacant derived request+request ATA. Arm verifies the canonical exact message/signature locally before simulation. Trigger repeats current-state/budget checks and requires successful non-authorizing simulation without replacing the nonce blockhash. Arm and trigger verify the owner signature locally, then send only a serialization with every signature zeroed, `sigVerify=false` and `replaceRecentBlockhash=false`. The exact nonce-first message stays unchanged. A simulation RPC receives no reusable owner-signed close authority; only the actual sender after a persisted intent receives the original signed bytes. Definitive binding changes persist INVALIDATED. RPC transport/coverage uncertainty does not invalidate an otherwise armed ticket and does not create an intent. Safe refusal codes include `SIGNATURE_INVALID`, `MESSAGE_MODIFIED`, `TARGET_CHANGED`, `NONCE_CHANGED`, `SENDER_DISABLED`, `TRIGGER_MISMATCH`, `SIMULATION_FAILED` and `STATE_BLOCKED`; raw provider errors, packets and keys are redacted.

Local submission requires `--local-test` and exact `http://127.0.0.1:<port>`. Public submission is default disabled. A protected code path exists behind `--live-envelope PRIVATE_FILE`; **it was never invoked on public RPC in this build**. It requires a reviewed HTTPS endpoint, an expiring exact envelope matching the stored ticket ID, message hash, packet hash, signature, endpoint, genesis, trigger and immutable fee/rent caps, plus an owner-approval reference. Merely preparing this file is not approval. Use it only after the separate exact live-action approval. Envelope fields: `version:1`, `kind:"EXACT_REVIEWED_LIVE_CLOSE_TICKET"`, `ticketId`, `messageHash`, `packetHash`, `signature`, `endpoint`, `genesis`, `triggerEvent`, `maxFeeLamports`, `maxRentLamports`, `expiresAt` and `ownerApprovalReference`. Its enabled transport branch is covered only by synthetic transport tests.

## Restart, recovery and closure

A pre-signing recovery limitation remains: a crash or unsigned-output file failure after the PREPARED DB reservation can leave its ID unprinted. Recover the public ID by inspecting the selected DB read-only, then call status. Never reset/delete reservations or blindly retry with new authority. The CLI does not automatically reconstruct a missing unsigned output; no owner signature or send intent was created in that window.

Every command opens the same selected DB and external key independently. ARMED survives restart. SUBMITTING/UNKNOWN/REQUEST_PENDING never create another send intent. On timeout, crash or interrupted send, run read-only reconciliation; do not manually reset status or replay bytes. Known failed execution with consumed finalized nonce becomes FAILED_CONSUMED. Unknown signatures, missing requests, unrelated nonce changes and later zero positions stay UNKNOWN. Such states block a new active ticket.

DISABLED is local only and applies only before send; it does not revoke the signed packet. Cryptographic revoke requires the owner's separately authorized wallet action to advance the dedicated nonce. `confirm-revoke` observes the changed finalized nonce and can mark an unused ARMED or DISABLED ticket REVOKED, only with no persisted send intent. Disable→owner nonce advance→confirm-revoke is supported; neither DISABLED nor REVOKED can send or re-enable. A pending Jupiter request requires a distinct provider request-cancel action, which this CLI does not perform. Request cancel is not keeper closure.

CLOSED requires a finalized correlated keeper receipt, the same target's finalized zero size, and a demonstrated owner-recipient token outcome. This implementation accepts **legacy or v0/ALT finalized transactions containing `decreasePosition4` and `closePositionRequest2`, together or split across two ordered receipts**, each referencing the exact request/position/pool/custodies, with a positive SPL-token transfer from the exact request ATA to the pinned recipient under that close instruction, authority=request PDA, and a positive balance increase for the pinned owner/mint. An unrelated transfer increasing the same recipient balance is insufficient. It checks that the request submission finalized successfully and keeper/finalized position observations occur afterwards. Pass reduction receipt via `--keeper-signature` and, if separate, payout receipt via `--payout-signature`. v0 lookup keys are resolved only from actual finalized transaction metadata, never guessed or fetched from a mutable later ALT. A missing/failed/unordered/mismatched receipt cannot prove closure. Same-transaction reduction must precede payout; separate same-slot receipts lack an ordering proof here and remain UNKNOWN. The matched reduction instruction must emit a Jupiter-origin `DecreasePositionEvent` for the exact owner/request/position/pool/custodies/mints, original position open time, price bound and a positive delta equal to the original full size. The matched payout instruction must emit `ClosePositionRequestEvent` with `executed=true`, `entirePosition=true` and an amount matching the actual positive request-ATA token transfer. Events are decoded from bounded Anchor self-CPI instruction bytes under that exact outer instruction, with actual Jupiter program, event-authority PDA and invocation depth2; arbitrary log text is not evidence. Pinned event fields are decoded from the IDL; bounded appended fields supply no additional evidence. Event `positionSizeUsd` is not assumed to be post-zero; zero must be independently observed in the same lifecycle. It conservatively leaves **CPI-only, removed Position accounts and zero-payout outcomes UNKNOWN**. Such evidence requires a concrete follow-up decision; the current CLI does not silently weaken its closure gate. No synthetic keeper test is provider closure evidence.

Before a live proposal can be accepted, the owner must supply/review: wallet public key and actual dedicated open position; nonce account setup/value and owner authority; correct receiving ATA/mint and its existence; explicit USD6 price bound and new counter; current genesis/deployment; fee/rent/setup/funding budget; exact trigger scenario; no manual close/reopen while ARMED or PENDING; owner-signing UX; nonce revoke and post-send request-cancel/recovery procedure; accessible provider keeper receipt shape and acceptance criteria. Funding, wallet connection/signing, nonce setup/revoke, sending and trading remain separate live authorizations. No such account-specific input or approval is invented here.

## Reproduce safe evidence

```sh
npm run test:jupiter-ticket
npm run test:database
npm run test:risk-guard
npm run test:risk-automation
npm run test:exchange-api
npm run build
'/Users/flydge/Library/Application Support/AntyTILT/nonce-verification-2026-10-11/venv/bin/python' -B scripts/jupiter-close-ticket-local-rehearsal.py
```

The canonical native harness supports `--public-directory`, `--solana-bin`, `--postgres-bin` and `--node24`. It reads only public snapshots/IDL/captured ELF and tool binaries, checks metadata/hash, creates ephemeral role keys and all signed packets/ledgers privately outside the checkout, starts a task-owned native validator and PostgreSQL cluster, exercises the actual CLI across process restarts, and stops both. It also tests local disable, unchanged-nonce refusal, actual ephemeral-owner nonce advance, observed REVOKED and a freshly signed separate replacement ticket. It clones mainnet feature selection read-only at local genesis to avoid future-feature incompatibility. Its synthetic Long position is explicitly rebound to a throwaway owner; historical closed position data is never presented as a live armable position. There is no keeper.

The successful original native receipt lives in `/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-native-sbw4004j/receipt.json`, SHA256 `a8b39f54ad0e205d7e8ac71a055ba40baf96529172666d3391f0060a42ee9730`. It records immutable packet, consumed nonce, request creation, unchanged position, native cost and REQUEST_PENDING, plus negative wrong-signature/trigger/default-sender/repeat cases. Earlier failures stay in separate external directories. Large validator ELF/ledger/cache files are never copied into repository/history.

The independent owner's native nonce semantics receipt demonstrates real processed-failure consumption and stale-message replay refusal. It remains separate from this operator/Jupiter request evidence. Public owner acceptance and final keeper closure remain open.


The review round1 corrected three blocking predicate gaps: reusable signatures formerly present in simulation; missing actual positive reduction/executed event evidence; and disabled-ticket revoke confirmation. These are now covered by raw RPC-body, event-context and real PostgreSQL/native recovery regressions. The original independent review remains preserved. Live keeper fulfillment and owner wallet UX remain unaccepted.

Review-fixed native receipt: `/var/folders/kq/zqwqqfmj4072vtjqsv4wsd700000gn/T/jupiter-ticket-native-wtoxvs6e/receipt.json`, SHA256 `49c000db56bd98018f44e738e4dad0f50c0c11b96a5c2cfb89e8276bfca4c110`. It verifies unsigned-message simulation through the actual handler, DISABLED→nonce advance→REVOKED with no send intent, and a fresh independently signed ticket ending REQUEST_PENDING. Event provenance follows [Anchor event-CPI documentation](https://www.anchor-lang.com/docs/features/events); the observed public event-shape evidence is an unexecuted close, not reduction/closure acceptance.
