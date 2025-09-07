# Blipper

Have vibe coding remotely and async. Start stuff, get out, get back and continue.

The gist is to be able to iterate on things, in a disposable VPS.

We'll use any CLI, for no it starts with Claude Code, and GitHub cli, if we want to pull/push private repos.

Cloud-init / User data:

```yml
#cloud-config

users:
  - name: blipper
    groups: sudo, docker
    shell: /bin/bash
    sudo: [ 'ALL=(ALL) NOPASSWD:ALL' ]
    lock_passwd: true
    ssh_authorized_keys:
      - "{{SSH_PUBLIC_KEY}}"

groups:
  - docker

# Set timezone
timezone: Europe/Lisbon
```

Then,

```bash
ssh blipper@VPS_IP
```

And run:

```bash
curl -sSL https://raw.githubusercontent.com/ijpatricio/blipper/main/install/install.sh | bash
```

This will install Blipper, to allow having multiple SSH sessions in the VPS!
