#!/usr/bin/env bash

set -e

sudo apt-get update

# Base OS (Node.sj  needs)
sudo apt install -y build-essential


# Install Node.js 24 using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation immediately
node -v || /usr/bin/node --version || echo "Node.js not found at /usr/bin/node"

# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt-get update
sudo apt-get install -y gh

# Setup NPM
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Blipper
cd ~
git clone https://github.com/ijpatricio/blipper.git
cd blipper
npm ci

# Start and stop manually
# npm run start

# Install Blipper as a service
sudo cp ~/blipper/configs/Blipper.service /etc/systemd/system/blipper.service
sudo systemctl daemon-reload
sudo systemctl enable blipper
sudo systemctl start blipper
sudo systemctl status blipper
