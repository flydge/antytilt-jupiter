# Phantom ownership request formatting — 2026-10-13

The owner reported Phantom rejecting the ownership request before presenting a
signature prompt: invalid formatting. The server emitted
`Chain ID: solana:<genesis hash>`. Phantom's published SIWS ABNF accepts named
networks in that field, not a genesis hash:
<https://github.com/phantom/sign-in-with-solana#abnf-message-format>.

This app supports mainnet and isolated native rehearsal. The challenge now uses
`mainnet` or `localnet` respectively. The exact genesis remains signed as the URI
resource `urn:solana:genesis:<hash>` and remains part of the database scope. Host
(including port), exact URI origin, owner, nonce, request ID, expiry, Ed25519
verification and atomic replay protection remain enforced.

Verification:

- A new real-PostgreSQL mainnet challenge regression failed against the original
  implementation with `Phantom rejects unsupported SIWS Chain ID`.
- After the fix, all 42 wallet/UI and close-ticket tests passed. The regression
  also rejects a signature over an altered genesis resource and accepts the
  exact fresh challenge.
- `npm run build` succeeded; the existing bundle-size advisory remains.
- Only the task-owned mainnet API/frontend were restarted. Native validator,
  PostgreSQL, vault and saved tickets were preserved.
- Actual HTTP through `http://127.0.0.1:15974` returned `Chain ID: mainnet`,
  matching host/URI and exact genesis resource; an ephemeral disposable Ed25519
  owner proof verified and was disconnected. No real wallet connection or
  transaction send was performed by the agent.
- Chrome was reloaded and the Jupiter panel opened for the owner. This proves
  updated app/API availability, not Phantom signature acceptance. The owner
  must retry their personal approval; keeper closure remains separately open.

Task-local screenshot: `/tmp/antytilt-siws-format-updated-20261013.png`.
