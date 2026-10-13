// Isolated browser rehearsal harness only. Never mount this router in server/index.
import { createPrivateKey, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Keypair, Transaction } from '@solana/web3.js'
import { z } from 'zod'
import { app } from '../server/index.js'
import {
  applicationDatabasePool,
  closeDatabase,
  initializeDatabase,
} from '../server/postgres.js'
import { closeRedis, initializeRedis } from '../server/redis.js'
import { createUser, getAuthenticatedUser } from '../server/database.js'
import { walletUiService } from '../server/jupiterWalletUi/routes.js'
import { hash } from '../server/jupiterCloseTicket/builder.js'
import { privateExternalFile } from '../server/jupiterCloseTicket/vault.js'
const service = await walletUiService()
if (
  service.config.mode !== 'native-rehearsal' ||
  process.env.NODE_ENV !== 'test'
)
  throw new Error('Native harness requires isolated test mode')
const manifest = JSON.parse(
  readFileSync(process.env.JUPITER_NATIVE_MANIFEST!, 'utf8'),
)
const owner = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      privateExternalFile(
        manifest.nativeWalletKey,
        process.cwd(),
        1024,
      ).toString(),
    ),
  ),
)
const origin = service.config.trustedOrigin,
  pool = await applicationDatabasePool()
await Promise.all([initializeDatabase(), initializeRedis()])
await createUser(
  'native-rehearsal@antytilt.local',
  'Native-rehearsal-only-20261012',
).catch(() => {})
const requests = { messageSignatures: 0, transactionSignatures: 0 }
app.get('/api/jupiter/rehearsal/wallet', async (req, res) => {
  try {
    const token = req.headers.cookie
      ?.split(';')
      .find((v) => v.trim().startsWith('antytilt_auth='))
      ?.trim()
      .slice(14)
    if (!token || !(await getAuthenticatedUser(token)))
      throw new Error('Sign in first')
    res.set('Cache-Control', 'no-store').json({
      owner: owner.publicKey.toBase58(),
      label: 'Native rehearsal wallet',
      ...requests,
    })
  } catch {
    res.status(401).json({ error: 'Native rehearsal app session required' })
  }
})
for (const kind of ['message', 'transaction'] as const)
  app.post('/api/jupiter/rehearsal/sign-' + kind, async (req, res) => {
    try {
      if (req.get('origin') !== origin) throw new Error('Origin')
      const token = req.headers.cookie
        ?.split(';')
        .find((v) => v.trim().startsWith('antytilt_auth='))
        ?.trim()
        .slice(14)
      const user = token ? await getAuthenticatedUser(token) : undefined
      if (!user) throw new Error('Session')
      const scope = { userId: user.id, sessionId: hash(token!), origin }
      await service.ownership.requireMutation(
        scope,
        req.get('x-jupiter-csrf') ?? '',
      )
      res.set('Cache-Control', 'no-store')
      if (kind === 'message') {
        const input = z
            .object({ message: z.string().max(4096) })
            .strict()
            .parse(req.body),
          message = Buffer.from(input.message, 'base64')
        const row = (
          await pool.query(
            'SELECT id FROM jupiter_ui_challenges WHERE user_id=$1 AND session_id=$2 AND origin=$3 AND owner_key=$4 AND message=$5 AND consumed=FALSE AND expires_at>$6',
            [
              user.id,
              scope.sessionId,
              origin,
              owner.publicKey.toBase58(),
              message.toString(),
              Date.now(),
            ],
          )
        ).rows[0]
        if (!row) throw new Error('Unregistered native proof')
        const key = createPrivateKey({
          key: Buffer.concat([
            Buffer.from('302e020100300506032b657004220420', 'hex'),
            Buffer.from(owner.secretKey).subarray(0, 32),
          ]),
          type: 'pkcs8',
          format: 'der',
        })
        requests.messageSignatures++
        res.json({ signature: sign(null, message, key).toString('base64') })
      } else {
        const input = z
            .object({ unsignedPacket: z.string().max(1644) })
            .strict()
            .parse(req.body),
          tx = Transaction.from(Buffer.from(input.unsignedPacket, 'base64')),
          messageHash = hash(tx.serializeMessage())
        if (
          tx.signatures.some((s) => s.signature) ||
          tx.feePayer?.toBase58() !== owner.publicKey.toBase58() ||
          (await service.ownership.owner(scope)) !== owner.publicKey.toBase58()
        )
          throw new Error('Native unsigned owner mismatch')
        let approved = false
        for (const t of await service.list(scope)) {
          if (t.status === 'PREPARED' && t.messageHash === messageHash) {
            await service.signingMessage(scope, t.id)
            approved = true
          }
        }
        const actions = (
          await pool.query(
            "SELECT * FROM jupiter_ui_actions WHERE user_id=$1 AND wallet_owner=$2 AND status='PREPARED'",
            [user.id, owner.publicKey.toBase58()],
          )
        ).rows
        for (const a of actions)
          if (service.actionPreview(a).messageHash === messageHash)
            approved = true
        if (!approved) throw new Error('Unregistered native transaction')
        tx.sign(owner)
        requests.transactionSignatures++
        res.json({ packet: tx.serialize().toString('base64') })
      }
    } catch {
      res.status(403).json({ error: 'Native rehearsal signing refused' })
    }
  })
const server = app.listen(Number(process.env.API_PORT), '127.0.0.1', () =>
  console.log('Native rehearsal API ready'),
)
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, async () => {
    server.closeIdleConnections()
    await new Promise<void>((r) => server.close(() => r()))
    await Promise.allSettled([closeRedis(), closeDatabase()])
    process.exit(0)
  })
