# Jupiter risk coverage — user clarification, 2026-10-13

## Required outcome

The same risk policy must cover both positions opened through AntyTILT's
terminal and positions opened directly on Jupiter. These are two entry paths
into one protection scope, not alternatives for the user to choose between.
This records the user's clarified requirement; it is not an approved expanded
implementation handoff or a claim of continuous protection.

## Required behavior

- Terminal entry: validate policy on the server before sending an opening
  order; reject forbidden entries. An accepted position must then remain
  monitored and eligible for the policy's subsequent protective actions.
- External entry: discover the actual account position, include it in the
  same policy evaluation and perform only protective actions for which valid
  execution authority exists. Discovery alone is not closing authority.
- Missing signing authority, changed position, stale/missing data or an
  uncertain execution must remain visible as incomplete protection. A new
  external position cannot silently inherit a consumed close ticket.
- Provider positions and fills are the source of actual exposure; terminal
  order acknowledgments and discovered fills must not be counted twice.

## Verified baseline and open boundaries

The current Jupiter slice is one existing SOL Long with wSOL collateral and
one exact pre-signed manual close ticket. Actual owner setup and ticket arm
were observed; one real submission and same-lifecycle zero position with a
native-SOL return route were observed. Strict UI CLOSED confirmation still
needs a narrowly authenticated native payout predicate.

The existing OrderEntryPanel has BingX order execution and risk-policy UI;
Jupiter currently has a separate wallet/close-ticket panel. Continuous Jupiter
risk-trigger execution and Jupiter opening via the terminal are not established
by the close test. They require a refreshed plan for this broader requirement,
including a verified authority mechanism for future external positions. No
new real wallet grant, signature, trade, or automatic trigger is authorized
by this requirements record.
