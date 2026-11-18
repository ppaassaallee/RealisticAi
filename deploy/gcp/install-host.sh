#!/usr/bin/env bash
set -euo pipefail
# Run as root on the new dedicated Ubuntu 24.04 VM only.
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y docker.io docker-compose-v2 ca-certificates
systemctl enable --now docker
install -d -m 700 /opt/ai-kiosk /opt/ai-kiosk/releases
install -d -o 1000 -g 1000 -m 700 /opt/ai-kiosk/data
