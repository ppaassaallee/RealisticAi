# GCP private demo deployment

This setup runs Alex and Juliana on **one Compute Engine VM**, one Node process, a persistent boot disk, and Caddy for HTTPS plus a demo password. It preserves the application's current synchronous JSON storage. Do not scale the container or add VM replicas. For multi-instance production, migrate stores and the call limiter to a transactional database first.

## Prerequisites

- A Google account authorized to create projects, link an existing billing account, create Compute resources and SSH through IAP. Organization policies can require a project folder or additional permissions.
- Authenticated `gcloud`, Git and Node 22+ locally (or in Cloud Shell); Apache `htpasswd` for password hashing.
- A domain/subdomain pointing to the reserved IP. For a temporary demo, a hostname such as `ai-kiosk.<VM-IP>.sslip.io` can be used if permitted by your organization; it depends on that third-party DNS service. A domain you control is preferable.
- Existing local `.env.local` with Tavus credentials and both avatar IDs. Never add these to Git, build context, cloud metadata or command arguments.

## 1. Create dedicated infrastructure

From the repository root, select a unique project ID and your existing billing account:

```sh
gcloud auth login
export PROJECT_ID=ai-kiosk-demo-UNIQUE_SUFFIX
export BILLING_ACCOUNT=YOUR_BILLING_ACCOUNT_ID
bash deploy/gcp/provision.sh
```

The script creates a project (if absent), links billing, enables Compute and IAP, creates a dedicated network, reserves an external IP and starts an Ubuntu 24.04 `e2-standard-2` VM with a 30 GB persistent disk. No cloud service account is attached. HTTP/HTTPS are reachable externally; SSH is restricted to IAP's range. Port 3000 is not published. The disk is retained on VM deletion and deletion protection is enabled. Stopping a VM preserves its disk; neither disk nor static IP is free when the VM is stopped. Review GCP's live pricing and create a billing budget alert; alerts do not impose a hard spending cap.

Use `ZONE` and `REGION` together to choose another location. `GCLOUD` may be set to an absolute CLI path. Do not run against an unrelated existing project or VM name. The scripts do not alter your gcloud default project.

## 2. Prepare HTTPS and secrets

Point your hostname's DNS A record at the reserved IP; remove any stale AAAA record. Then:

```sh
export DEMO_HOST=demo.example.com
node deploy/gcp/prepare-env.mjs
```

This copies only the five required Tavus values into ignored, mode-600 files under `.cloud`, generates distinct staff/admin/operator/viewer tokens, and hashes a new visitor password. Credentials are in `.cloud/access.txt`; share only the visitor username/password with demo guests. The files are never printed. This step refuses to overwrite existing credentials.

Cloud secrets are installed root-readable only in `/opt/ai-kiosk/runtime.env` and `/opt/ai-kiosk/proxy.env` on the encrypted persistent disk. Only the app container receives Tavus secrets. For an enterprise rollout, use Secret Manager and an appropriate IAM model rather than distributing an environment file.

## 3. Publish the committed release

Commit the deployment files and desired app changes first: publication uses `git archive HEAD` and deliberately excludes uncommitted edits and local records.

```sh
export RUNTIME_ENV="$PWD/.cloud/runtime.env"
export PROXY_ENV="$PWD/.cloud/proxy.env"
bash deploy/gcp/publish.sh
```

The build runs on the VM, so Docker is not required on your Mac. Source and private environment files travel through authenticated SSH/IAP. Containers restart after a VM reboot; the app runs as a non-root user. Caddy obtains and renews a public TLS certificate when DNS and ports 80/443 work. All app routes, assets and APIs are behind the visitor password. Authentication to the demo is separate from staff/admin credentials.

Visit `https://YOUR_HOST/platform`, `/kiosk`, `/juliana`, `/staff`, `/analytics` and `/juliana/admin`. The microphone requires HTTPS. Google Meet can share the Chrome demo tab and its audio.

## 4. Verify before inviting guests

- Unauthenticated HTTPS requests must return 401; HTTP should redirect to HTTPS.
- Authorized `/platform`, both avatars and staff login must load without JS errors.
- Restart the app container and verify synthetic session/settings data survives.
- One short opt-in Tavus call can verify live media; end it immediately afterward. Other attempts across both avatars must be blocked while it is active.
- Never expose port 3000, remove proxy authentication or run multiple Node processes with these stores.

The cloud default permits **one in-flight Tavus call across both avatars and all devices on this deployment**. Reservations persist through restarts and expire after the provider's five-minute maximum plus a 30-second margin. Unknown creation failures retain their reservation; a confirmed close releases it. Other apps using the same Tavus workspace are outside this limit. Five-minute maximum, 90-second silence stop and 45-second connection timeout remain enabled. There are no automatic paid retries. This is a concurrency limit, not a daily Tavus spending cap.

## Operations

SSH using `gcloud compute ssh ai-kiosk-demo --project="$PROJECT_ID" --zone=us-central1-a --tunnel-through-iap`.

On the VM, use the current Compose file and project name:

```sh
sudo docker compose -p ai-kiosk --env-file /opt/ai-kiosk/proxy.env -f /opt/ai-kiosk/current/deploy/gcp/compose.yaml ps
sudo docker compose -p ai-kiosk --env-file /opt/ai-kiosk/proxy.env -f /opt/ai-kiosk/current/deploy/gcp/compose.yaml logs --tail=80 app
```

For updates, repeat `publish.sh` during a demo-free window. Existing data stays in `/opt/ai-kiosk/data`. Releases and images remain on disk; monitor `df -h` and clean only reviewed old releases/images. Do not run `docker system prune --volumes`.

For rollback, select a previous directory under `/opt/ai-kiosk/releases`, set `APP_IMAGE=ai-kiosk:ITS_COMMIT`, and run its Compose file with the same project name and environment file; then update the `current` symlink. Future schema changes may require restoring a matching backup. No database migration is included here.

For backups, stop the app during a demo-free window, snapshot the persistent boot disk using Compute Engine, then restart the app. Restrict access to snapshots: they include deployment secrets. Take a snapshot before upgrades and verify restore to a separate VM. No scheduled snapshot policy is enabled automatically.

To reduce hosting consumption between demos:

```sh
gcloud compute instances stop ai-kiosk-demo --project="$PROJECT_ID" --zone=us-central1-a
# Later:
gcloud compute instances start ai-kiosk-demo --project="$PROJECT_ID" --zone=us-central1-a
```

End active Tavus calls before stopping or updating. Provider cutoffs remain the fallback for abrupt shutdowns. Disk and reserved-IP charges continue while stopped. No GPU is required; Tavus performs avatar generation externally.

## References

- [Compute Engine instance creation](https://docs.cloud.google.com/compute/docs/instances/create-start-instance)
- [IAP TCP forwarding](https://docs.cloud.google.com/iap/docs/using-tcp-forwarding)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Caddy password protection](https://caddyserver.com/docs/caddyfile/directives/basic_auth)
- [Tavus call properties](https://docs.tavus.io/openapi.yaml)

This is a password-protected synthetic demo deployment, not a production banking or patient-data system.
