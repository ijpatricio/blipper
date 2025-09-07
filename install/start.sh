#!/usr/bin/env bash

set -e

# Install Blipper as a service, will run in the background
sudo cp ~/blipper/install/Blipper.service /etc/systemd/system/blipper.service
sudo systemctl daemon-reload
sudo systemctl enable blipper
sudo systemctl start blipper
sudo systemctl status blipper --no-pager
