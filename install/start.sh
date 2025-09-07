#!/usr/bin/env bash

set -e

# Install Blipper as a service, will run in the background
sudo cp ~/blipper/install/Blipper.service /etc/systemd/system/blipper.service
sudo systemctl daemon-reload
sudo systemctl enable blipper
sudo systemctl status blipper --no-pager

sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
