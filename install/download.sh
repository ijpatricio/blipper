#!/usr/bin/env bash

set -e

# Download Blipper
cd /home/blipper
git clone https://github.com/ijpatricio/blipper.git
cd blipper
cp .env.example .env

echo "┌─────────────────────────────────────────────┐"
echo "│  ⚠️  IMPORTANT: Change user and password    │"
echo "│  in the .env file                           │"
echo "│                                             |"
echo "│  Run:                                       |"
echo "│     cd blipper                              |"
echo "│     nano .env                               |"
echo "│                                             |"
echo "│  Then run: ./install/install.sh             │"
echo "└─────────────────────────────────────────────┘"
