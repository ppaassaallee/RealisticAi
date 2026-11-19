# Active demo deployment

Verified November 19, 2026.

- Demo: https://ai-kiosk.136.115.147.162.sslip.io/platform
- Alex: https://ai-kiosk.136.115.147.162.sslip.io/kiosk
- Juliana: https://ai-kiosk.136.115.147.162.sslip.io/juliana
- GCP project: `ai-kiosk-demo-20261118`
- VM: `ai-kiosk-demo`, `us-central1-a`, `e2-standard-2`
- Static address: `136.115.147.162`
- Billing account: user-selected account ending `C314BE`
- Running application source: `dc11a3d43890`
- One app container and one Caddy proxy; persistent data under `/opt/ai-kiosk/data`

Visitor credentials are in the deployment operator's ignored `.cloud/demo-login.txt`. Staff/admin credentials are in `.cloud/access.txt`; do not distribute that file to demo guests. Both files are local and are intentionally absent from this repository.

Use the [operations guide](README.md) for updates, backups, rollback and stopping/starting the VM. The demo remains available while the Mac is off. Hosting incurs ongoing VM, disk, IP and network charges; Tavus minutes are separate. This initial demo uses a generated sslip.io hostname; replace it with an organization-owned domain when desired.
