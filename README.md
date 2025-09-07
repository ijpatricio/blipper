# Blipper

Have vibe coding remotely and async. Start stuff, get out, get back and continue.


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

Manually:

```bash
curl -sSL https://raw.githubusercontent.com/ijpatricio/blipper/main/install/install.sh | bash
```

