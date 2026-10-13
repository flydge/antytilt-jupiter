import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { Pool } from 'pg'
import { PacketVault } from '../server/jupiterCloseTicket/vault.js'
import { TicketStore } from '../server/jupiterCloseTicket/store.js'
import {
  ReadOnlyRpc,
  accountBytes,
  nonceState,
} from '../server/jupiterCloseTicket/reader.js'
import { hash, PROGRAM } from '../server/jupiterCloseTicket/builder.js'
const [manifestPath, phase] = process.argv.slice(2)
if (!manifestPath || !['before', 'after'].includes(phase))
  throw new Error('Native manifest and before/after phase required')
const m = JSON.parse(readFileSync(manifestPath, 'utf8')),
  c = JSON.parse(readFileSync(m.config, 'utf8'))
if (
  c.mode !== 'native-rehearsal' ||
  c.rpc !== 'http://127.0.0.1:19980' ||
  m.network !== 'isolated-native-loopback'
)
  throw new Error('Exact isolated native boundary required')
const pool = new Pool({ connectionString: m.database_url }),
  store = new TicketStore(pool, new PacketVault(c.keyFile, process.cwd())),
  rpc = new ReadOnlyRpc(c.rpc)
try {
  const rows = (
    await pool.query(
      'SELECT id,status FROM jupiter_close_tickets WHERE owner_key=$1',
      [m.owner],
    )
  ).rows
  const target = rows.find((r) =>
    phase === 'before'
      ? r.status === 'ARMED'
      : ['SUBMITTING', 'REQUEST_PENDING', 'UNKNOWN'].includes(r.status),
  )
  if (!target) throw new Error('Native phase ticket unavailable')
  const t = await store.get(target.id),
    b = t.prepared.binding
  const read = await rpc.call('getMultipleAccounts', [
    [b.position, b.nonce, b.owner, t.prepared.request],
    {
      encoding: 'base64',
      commitment: 'finalized',
      minContextSlot: b.observedSlot,
    },
  ])
  const [position, nonce, owner, request] = read.value
  const auth = await fetch(c.trustedOrigin + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: c.trustedOrigin },
    body: JSON.stringify({
      email: 'native-rehearsal@antytilt.local',
      password: 'Native-rehearsal-only-20261012',
    }),
  })
  const cookie = auth.headers.get('set-cookie')?.split(';')[0]
  if (!auth.ok || !cookie) throw new Error('Native metrics session unavailable')
  const metrics = (await fetch(
    c.trustedOrigin + '/api/jupiter/rehearsal/wallet',
    { headers: { Cookie: cookie, Origin: c.trustedOrigin } },
  ).then((r) => r.json())) as {
    transactionSignatures: number
    messageSignatures: number
  }
  const receipt = {
    phase,
    network: m.network,
    realSolSpent: 0,
    keeperPresent: false,
    ticketId: t.id,
    status: t.status,
    packetHash: t.packetHash,
    messageHash: t.prepared.messageHash,
    signature: t.signature,
    recipient: b.recipient,
    request: t.prepared.request,
    positionHash: hash(accountBytes(position)),
    ownerLamports: owner.lamports,
    nonceConsumed: nonceState(nonce).value !== b.nonceValue,
    requestCreated: request?.owner === PROGRAM.toBase58(),
    observedSlot: read.context.slot,
    transactionSignatures: metrics.transactionSignatures,
    messageSignatures: metrics.messageSignatures,
    reviewEncrypted: (
      await pool.query(
        'SELECT review_json,authorization_ciphertext FROM jupiter_ui_tickets WHERE ticket_id=$1',
        [t.id],
      )
    ).rows.every(
      (r) =>
        r.review_json.startsWith('v1.') &&
        r.authorization_ciphertext.startsWith('v1.'),
    ),
    unusedTickets: rows.filter((r) => r.status === 'REVOKED').length,
    recordedAt: new Date().toISOString(),
  }
  let path = new URL('./browser-' + phase + '.json', 'file://' + manifestPath)
    .pathname
  if (existsSync(path))
    path = path.replace(/\.json$/, '-' + Date.now() + '.json')
  writeFileSync(path, JSON.stringify(receipt, null, 2) + '\n', {
    mode: 0o600,
    flag: 'wx',
  })
  console.log(
    JSON.stringify({
      phase,
      path,
      status: receipt.status,
      transactionSignatures: receipt.transactionSignatures,
      nonceConsumed: receipt.nonceConsumed,
      requestCreated: receipt.requestCreated,
      reviewEncrypted: receipt.reviewEncrypted,
    }),
  )
} finally {
  await pool.end()
}
