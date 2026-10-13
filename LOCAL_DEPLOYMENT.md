# Local always-on test deployment

This profile runs the same production API and independent RM worker used by the
Render deployment. It is intended for a small private beta while the Mac remains
powered on and online.

## Topology

- `api`: compiled React frontend and Express API on one origin;
- `worker`: independent BullMQ RM monitor;
- `postgres`: durable users, exchange accounts, risk profiles and audit history;
- `redis`: persistent queue, account locks and worker heartbeat;
- optional `quick-tunnel`: temporary public HTTPS URL for testers;
- optional `tunnel`: permanent named Cloudflare Tunnel.
- `beta-gateway`: an additional HTTP Basic Auth barrier in front of either
  public tunnel.

Only `127.0.0.1:8787` is published on the Mac. PostgreSQL and Redis do not expose
host ports. Cloudflare Tunnel reaches the API through the private Compose network.

## First start

1. Install and start Docker Desktop, or use the lighter Colima engine:

   ```bash
   brew install docker docker-compose colima
   colima start --cpus 4 --memory 6 --disk 60
   ```
2. From the repository root run:

   ```bash
   chmod +x scripts/local-production.sh
   ./scripts/local-production.sh init
   ./scripts/local-production.sh start
   ```

3. Require both health endpoints to return `ok: true`:

   ```bash
   ./scripts/local-production.sh status
   ```

4. Open `http://127.0.0.1:8787` on the Mac.

The generated `.env.local-production` contains the PostgreSQL password and the
AES-256-GCM key that encrypts exchange API credentials. It is ignored by Git,
created with mode `0600`, and must be backed up separately. Replacing the key
makes already stored exchange credentials unreadable.

If the previous native local deployment already contains users or connected
exchange accounts, import it once before inviting testers:

```bash
./scripts/local-production.sh import-legacy
```

The importer refuses a non-empty container database, creates a safety dump, and
copies the existing local credential-encryption key so saved API credentials
remain decryptable.

## Temporary HTTPS access for testers

Start a random HTTPS URL:

```bash
./scripts/local-production.sh tunnel
```

Share only the printed `https://...trycloudflare.com` address. The URL changes
when the tunnel is recreated. The command also prints the shared private-beta
gateway username and password. Testers enter these once before the application's
own sign-in screen. Display them again with:

```bash
./scripts/local-production.sh access
```

Stop public access without stopping RM:

```bash
./scripts/local-production.sh tunnel-stop
```

Quick Tunnels are for short tests. For a stable hostname, create a named
Cloudflare Tunnel, route a domain to `http://api:8787`, copy its token into
`.env.local-production`, and run:

```bash
./scripts/local-production.sh named-tunnel
```

## Operations

```bash
./scripts/local-production.sh logs
./scripts/local-production.sh restart
./scripts/local-production.sh backup
./scripts/local-production.sh stop
```

Run `./scripts/local-production.sh keep-awake` in a dedicated Terminal window
while testers use the system. This uses macOS `caffeinate`; it changes no global
power settings. Keep the Mac connected to power and do not close the lid.

Docker's `unless-stopped` policy restarts services after process failure and
after the Docker engine starts. Configure Docker Desktop to launch at login, or
enable Colima with `brew services start colima`. This does not protect against a
power outage, router failure, macOS update, changing home public IP, or the
laptop being physically unavailable.

## Backups and safe shutdown

`backup` writes a custom PostgreSQL dump under the ignored `backups/` directory.
Copy both the dump and `.env.local-production` to separate encrypted storage.

`stop` retains both named volumes. Do not run `docker compose down --volumes`
unless permanent deletion of all local users, credentials and RM history is
explicitly intended.

Live Trading and Live RM are enabled in this profile. Live trigger orders remain
disabled. Exchange automation still requires the user's saved consent and the
configured RM policy. A sleeping or offline Mac cannot enforce RM, so use VST or
small controlled beta accounts until the managed server deployment is ready.
