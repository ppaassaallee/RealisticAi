#!/usr/bin/env bash
set -euo pipefail
# Run with an authenticated gcloud CLI. These commands create billable GCP resources.
: "${PROJECT_ID:?Set a globally unique GCP project ID}"
: "${BILLING_ACCOUNT:?Set the billing account ID}"
GCLOUD=${GCLOUD:-gcloud}
ZONE=${ZONE:-us-central1-a}
REGION=${REGION:-us-central1}
INSTANCE=${INSTANCE:-ai-kiosk-demo}
[[ "$PROJECT_ID" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || { echo 'Invalid project ID'; exit 1; }
parent=()
if [[ -n "${FOLDER_ID:-}" ]]; then parent=(--folder="$FOLDER_ID");
elif [[ -n "${ORG_ID:-}" ]]; then parent=(--organization="$ORG_ID"); fi
"$GCLOUD" projects describe "$PROJECT_ID" >/dev/null 2>&1 || "$GCLOUD" projects create "$PROJECT_ID" --name='AI Kiosk Demo' "${parent[@]}"
"$GCLOUD" billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
"$GCLOUD" services enable compute.googleapis.com iap.googleapis.com --project="$PROJECT_ID"
"$GCLOUD" compute networks describe ai-kiosk --project="$PROJECT_ID" >/dev/null 2>&1 || "$GCLOUD" compute networks create ai-kiosk --subnet-mode=auto --project="$PROJECT_ID"
for rule in ai-kiosk-web ai-kiosk-ssh; do
  if ! "$GCLOUD" compute firewall-rules describe "$rule" --project="$PROJECT_ID" >/dev/null 2>&1; then
    if [[ "$rule" == ai-kiosk-web ]]; then ports=tcp:80,tcp:443; sources=0.0.0.0/0; else ports=tcp:22; sources=35.235.240.0/20; fi
    "$GCLOUD" compute firewall-rules create "$rule" --project="$PROJECT_ID" --network=ai-kiosk --allow="$ports" --source-ranges="$sources" --target-tags=ai-kiosk
  fi
done
"$GCLOUD" compute addresses describe ai-kiosk-ip --project="$PROJECT_ID" --region="$REGION" >/dev/null 2>&1 || "$GCLOUD" compute addresses create ai-kiosk-ip --project="$PROJECT_ID" --region="$REGION"
IP=$("$GCLOUD" compute addresses describe ai-kiosk-ip --project="$PROJECT_ID" --region="$REGION" --format='value(address)')
if ! "$GCLOUD" compute instances describe "$INSTANCE" --project="$PROJECT_ID" --zone="$ZONE" >/dev/null 2>&1; then
  "$GCLOUD" compute instances create "$INSTANCE" --project="$PROJECT_ID" --zone="$ZONE" \
    --machine-type=e2-standard-2 --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud \
    --network=ai-kiosk --tags=ai-kiosk --address="$IP" --boot-disk-size=30GB --boot-disk-type=pd-balanced \
    --no-boot-disk-auto-delete --deletion-protection --no-service-account --no-scopes
fi
printf 'VM ready. Address: %s. Run deploy/gcp/publish.sh after SSH is available.\n' "$IP"
