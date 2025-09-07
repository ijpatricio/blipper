#!/usr/bin/env bash

set -e

# Download Blipper
cd /home/blipper
git clone https://github.com/ijpatricio/blipper.git
cd blipper
cp .env.example .env

# Check if initial-env file exists and update .env with credentials
if [ -f "/home/blipper/.initial-env" ]; then
    echo "Found initial environment file, updating credentials..."

    # Extract values from .initial-env
    BASIC_AUTH_USER=$(grep "^BASIC_AUTH_USER=" /home/blipper/.initial-env | cut -d'=' -f2)
    BASIC_AUTH_PASSWORD=$(grep "^BASIC_AUTH_PASSWORD=" /home/blipper/.initial-env | cut -d'=' -f2)

    # Update .env file if values were found
    if [ -n "$BASIC_AUTH_USER" ]; then
        sed -i "s/^BASIC_AUTH_USER=.*/BASIC_AUTH_USER=$BASIC_AUTH_USER/" .env
        echo "✓ Updated BASIC_AUTH_USER"
    fi

    if [ -n "$BASIC_AUTH_PASSWORD" ]; then
        sed -i "s/^BASIC_AUTH_PASSWORD=.*/BASIC_AUTH_PASSWORD=$BASIC_AUTH_PASSWORD/" .env
        echo "✓ Updated BASIC_AUTH_PASSWORD"
    fi

    rm /home/blipper/.initial-env

    echo "Credentials updated from initial environment file."
    echo "┌─────────────────────────────────────────────┐"
    echo "│  Now run: ./install/install.sh             │"
    echo "└─────────────────────────────────────────────┘"
else
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
fi
