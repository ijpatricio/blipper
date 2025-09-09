# Remote Vibe Coding (Revico)

Revico starts with the desire to be able to tinker with agentic coding, while on the go.

Not only on the go, but on a real system, with freedom and flexibility!
Interact in a browser, mobile, or at the desk as well, ofc.

- Remotely: I don't want things connecting to my computer, having to have it on, etc.
- Async: I want to give a task, be able to leave and catch up later, to continue from there.
- Multi-session: I might want to open more than 1 terminal.
- Disposable: I want to do that, in a VPS, which I can use for a couple of hours/days, then destroy it.

## Private projects

To clone public repositories via `https` URLS, it's open, just `git clone <repo_url>`

We want, maybe to pull/push private repositories.
GitHub cli is installed out of the box, for convenience.

Just run `gh` and you can authenticate.

## Agents/Models/CLI:

- Claude Code: my daily drive for now, so that's how we start.
- More may be added out of the box, or just install them yourself after boot.

## Webserver with SSL

Out of the box, we have a preset ready to use, for the terminal, and 3 Apps.
Let's just ask the AI to have the website running in one of those 3 app ports, they're good to go!

revico.<IP_ADDRESS>.sslip.io => Terminal App (port 3000)
app1.<IP_ADDRESS>.sslip.io => port 3001 
app2.<IP_ADDRESS>.sslip.io => port 3002
app3.<IP_ADDRESS>.sslip.io => port 3003

You may customize in `/etc/caddy/Caddyfile` (or ask AI to do that)
