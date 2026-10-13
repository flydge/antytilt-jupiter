# Mainnet owner close observation — 2026-10-13

The owner personally triggered the saved UI close ticket. The agent performed
only read-only reconciliation and diagnostic RPC reads; no repeat broadcast,
wallet signature or status override was performed.

## Finalized observations

- Submission finalized successfully at slot 456226248.
- Successful Jupiter execution finalized at slot 456226253, with outer
  `decreasePosition4` followed by `closePositionRequest2`.
- The original Position remains present, with owner and openTime matching its
  prepared binding, and both sizeUsd and collateralUsd zero.
- The request account is absent and the durable nonce has advanced.
- A SPL-token transfer under decreasePosition4 delivered 94,011,959 token
  units to the exact request ATA.
- SPL Token CloseAccount under closePositionRequest2 closed that exact request
  ATA to the owner wallet, with authority equal to the request PDA.
- Owner native SOL balance increased by 97,735,599 lamports in the successful
  execution receipt; this includes account-rent refunds and is not a pure
  trading-payout estimate. The separately prepared owner wSOL ATA has zero
  balance and no lamport increase in that execution.
- Two later keeper attempts failed with Custom3012 after the successful
  execution. They are not evidence of failed initial submission or permission
  to resend.

Public execution receipt:
https://solscan.io/tx/5qZ5poMeax5zWuYFApeWDZmxg4mi7qtRZajF77mwoRgnbJhfutcM6hWC7AvdzviGMb1Q2ZqdkrG7eS58muyUsUfR

## Current acceptance gap

The application correctly preserves UNKNOWN rather than fabricating CLOSED:
its strict keeperProof expects a positive request-ATA-to-reviewed-owner-ATA
SPL payout, whereas this real receipt unwraps native SOL by closing the request
ATA directly to the owner wallet. `keeperProof(ticket, receipt)` returned false.
The current predicate also requires complete bound Jupiter event evidence;
this diagnostic did not independently validate every event field. A follow-up
must add a narrowly authenticated native-SOL payout proof without accepting
arbitrary positive owner balance changes, unrelated transfers or request
cancellation as closure. Do not reset the ticket, loosen checks wholesale or
resend it.

This observation establishes successful real submission, same-lifecycle zero
position and the observed native return route. It is not acceptance of a
continuous automatic risk-management engine, future-position authorization,
or a completed strict CLOSED classification.
