# Phantom exact-message signing compatibility — 2026-10-13

Scope: one bounded compatibility fix for owner-reviewed setup/revoke and new
close-ticket signing; one implementation owner, one independent reviewer.
Keep exact message, nonce, owner, recipient, cap and single-send protection.
No agent-owned real wallet signing, funds transfer or public broadcast.

The owner reported `Wallet modified the exact reviewed message. Signing
stopped.` while signing mainnet setup. The original unsigned setup had no
Compute Budget price instruction. Phantom automatically injects priority fee
instructions into eligible unsigned transactions without a price policy:
<https://docs.phantom.com/developer-powertools/solana-priority-fees>.
Read-only inspection of installed static Phantom 26.32.0 code corroborated
its `hasComputeUnitPriceInstructions` short circuit; no wallet data was read
from extension storage. The failed signed packet was never accepted by the
app. Its reusable bytes were not captured or logged.

Fix: add explicit zero compute-unit price before setup/revoke message hashing
and RPC fee quote. The existing fee cap stays unchanged. New UI close tickets
use manifest version 2, with nonce advance first, then explicit zero price,
then the original entire-position Jupiter instruction. Default CLI version 1
remains byte-compatible, and store hydration/validation supports both exact
versions. Signed packet comparison remains strict on client and server.
Existing signed manifests are never migrated or rewritten.

Legacy unsigned setup previews are retired before reuse, even if their recent
blockhash is valid. A conditional-update row-count guard preserves a send
claimed concurrently and prevents creation of a second action.

Verification:

- Two regression tests failed against the original preparation with the same
  message-modified rejection / missing explicit priority policy. They pass
  after the fix. The Phantom injection reproduction is a characterized double,
  not proof of actual installed-wallet signature acceptance.
- All 44 Jupiter wallet/ticket tests passed after final changes. Real PostgreSQL
  checks cover v2 arm/reload, exact message hash restoration, unsigned legacy
  replacement, and concurrent SUBMITTING claim with no second action.
- Production build passed; existing bundle-size advisory remains.
- Independent Sol/high read-only review reported no remaining Critical/Important
  findings after the concurrent-action guard.
- Updated store directly hydrated the preserved native v1 REVOKED and
  REQUEST_PENDING records, with encrypted signed authority unchanged.
- Only the mainnet API/frontend supervisor was restarted; PostgreSQL, native
  validator, ledger, vault and existing tickets remained running/preserved.
- A transient read-only RPC refusal disappeared on refresh after direct
  availability checks. Real position discovery again returned the owner's
  existing SOL Long.
- Fresh unsigned mainnet setup simulation succeeded: 13,863 compute units,
  5,000 lamport fee cap, 2,545,080 lamport rent cap, explicit priority price 0,
  all signatures absent, no broadcast. The normal owner UI was used to prepare
  this exact new review.

Open gate: the human must retry the actual Phantom signature and setup send.
Neither wallet acceptance nor real keeper closure is claimed by these checks.

## Owner setup acceptance — 2026-10-13, 01:17 Europe/Warsaw

The owner personally signed and sent setup through the mainnet UI on port
15974. The agent observed SUBMITTING, selected only **Check action
confirmation**, and then observed **FINALIZED** with **Ready on finalized
state**. No second setup send was performed. The existing external SOL Long
remained visible. Screenshot: `/tmp/antytilt-mainnet-setup-finalized-20261013.png`.

This supersedes the setup retry gate above: the actual wallet setup path is now
accepted for this action. The close ticket has not been prepared, armed or
triggered, and genuine keeper closure remains unaccepted. Setup acceptance
does not establish durable-nonce close-signing acceptance or automatic risk
protection.

## Owner close-ticket arm acceptance — 2026-10-13, 01:21 Europe/Warsaw

After the owner personally prepared and signed a close ticket, the mainnet
browser displayed **ARMED** and **Encrypted ticket saved. No close request
has been sent.** Its reviewed floor is USD80/SOL, trigger expiry 01:50:41
local, fee cap 5,000 lamports and request rent cap 4,739,640 lamports.
The agent used only **Refresh wallet state**. An initial redacted RPC error
cleared after this read refresh, and ARMED, finalized setup and the existing
position remained visible. Screenshot:
`/tmp/antytilt-mainnet-ticket-armed-20261013.png`.

Actual owner close-ticket signing and persistence are now observed in the
mainnet app. No close request was triggered by the agent, and no genuine
keeper reduction or payout has yet been established. ARMED is not automatic
risk protection or a closed position.
