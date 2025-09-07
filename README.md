# Blipper

Blipper starts with desire to be able to tinker with agentic coding, while on the go, on my own terms!

 I'll in a browser, be it the mobile, or maybe at the desk as well, as I desire :)

- Remotely: I don't want things connecting to my computer, having to have it on, etc.
- Async: I want to give a task, be able to leave and catch up later, to continue from there.
- Multi-session: I might want to open more than 1 terminal.
- Disposable: I want to do that, in a VPS, which I can use for a couple of hours/days, then destroy.
- GitHub cli: I want, maybe to pull/push private repositories.

Agents/Models/CLI:
- Claude Code: my daily drive for now, so that's how we start.
- More may be added out of the box, or just install them yourself after boot. 

For now, we have to prepare the VPS, before leave the house, or at least

Use script `npm run create:server` and .env, or manually go in the form and create a VPS with this Cloud-init.

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

Then, login to VPS.

```bash
ssh blipper@VPS_IP
```

And run:

```bash
curl -sSL https://raw.githubusercontent.com/ijpatricio/blipper/main/install/download.sh | bash
```

This will install Blipper, to allow having multiple SSH sessions in the VPS!

Don't forget to change .env USER/PASSWORD before activating service!

See ya!

