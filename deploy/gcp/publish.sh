#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:?Set PROJECT_ID}"
: "${RUNTIME_ENV:?Path to private runtime.env}"
: "${PROXY_ENV:?Path to private proxy.env}"
GCLOUD=${GCLOUD:-gcloud}
ZONE=${ZONE:-us-central1-a}
INSTANCE=${INSTANCE:-ai-kiosk-demo}
ROOT=$(git rev-parse --show-toplevel)
RELEASE=$(git -C "$ROOT" rev-parse --short=12 HEAD)
BUNDLE=$(mktemp -d)
trap 'rm -rf "$BUNDLE"' EXIT
# Publish only committed source, never .env.local or local demo records.
git -C "$ROOT" archive HEAD | gzip > "$BUNDLE/source.tar.gz"
"$GCLOUD" compute scp --tunnel-through-iap --project="$PROJECT_ID" --zone="$ZONE" "$BUNDLE/source.tar.gz" "$INSTANCE:ai-kiosk-source.tar.gz"
"$GCLOUD" compute scp --tunnel-through-iap --project="$PROJECT_ID" --zone="$ZONE" "$RUNTIME_ENV" "$INSTANCE:ai-kiosk-runtime.env"
"$GCLOUD" compute scp --tunnel-through-iap --project="$PROJECT_ID" --zone="$ZONE" "$PROXY_ENV" "$INSTANCE:ai-kiosk-proxy.env"
"$GCLOUD" compute ssh "$INSTANCE" --tunnel-through-iap --project="$PROJECT_ID" --zone="$ZONE" --command="set -eu
mkdir -p ai-kiosk-upload
chmod 700 ai-kiosk-upload
tar -xzf ai-kiosk-source.tar.gz -C ai-kiosk-upload
sudo bash ai-kiosk-upload/deploy/gcp/install-host.sh
sudo install -m 600 ai-kiosk-runtime.env /opt/ai-kiosk/runtime.env
sudo install -m 600 ai-kiosk-proxy.env /opt/ai-kiosk/proxy.env
sudo mkdir -p /opt/ai-kiosk/releases/$RELEASE
sudo tar -xzf ai-kiosk-source.tar.gz -C /opt/ai-kiosk/releases/$RELEASE
rm -f ai-kiosk-runtime.env ai-kiosk-proxy.env ai-kiosk-source.tar.gz
sudo env APP_IMAGE=ai-kiosk:$RELEASE docker compose --project-name ai-kiosk --env-file /opt/ai-kiosk/proxy.env -f /opt/ai-kiosk/releases/$RELEASE/deploy/gcp/compose.yaml up --build -d --wait
sudo ln -sfn /opt/ai-kiosk/releases/$RELEASE /opt/ai-kiosk/current
sudo docker compose --project-name ai-kiosk --env-file /opt/ai-kiosk/proxy.env -f /opt/ai-kiosk/current/deploy/gcp/compose.yaml ps"
