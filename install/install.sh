#!/usr/bin/env bash

set -e

sudo apt-get update

# Base OS (Node.sj  needs)
sudo apt install -y build-essential

# Install Node.js 24 using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation immediately
node -v || /usr/bin/node --version

# Setup NPM
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

#Install project dependencies
npm ci

# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt-get update
sudo apt-get install -y gh

# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Caddy for SSL
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Get the VPS IP address
IPV4=$(ip route get 8.8.8.8 | awk '{print $7}')
HOST="revico.$IPV4.sslip.io"
# Fetch the Caddyfile from GitHub and replace the placeholder
CADDYFILE=$(curl -s https://raw.githubusercontent.com/ijpatricio/remote-vibe-coder/refs/heads/main/install/Caddyfile | sed "s/__IPV4__/$IPV4/g")
# Write the modified content to the Caddy configuration file
echo "$CADDYFILE" | sudo tee /etc/caddy/Caddyfile > /dev/null
echo "Caddyfile updated with IP: $IPV4"
sudo systemctl reload caddy

# Install Revico as a service, will run in the background
sudo cp ~/revico/install/Revico.service /etc/systemd/system/revico.service
sudo systemctl daemon-reload
sudo systemctl enable revico
sudo systemctl start revico
sudo systemctl status revico --no-pager

MSG="System started, visit: http://$HOST"
echo $MSG > /home/revico/revico-result.log
echo $MSG
