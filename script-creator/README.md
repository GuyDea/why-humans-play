# Script Creator

The local Why Humans Play script workbench: an Angular studio over a local
daemon that drives the codex CLI through skill operations.

## Start

```bash
cd script-creator
npm start
```

Builds the UI when it is stale, starts the daemon, and opens the printed
`http://127.0.0.1:<port>/#nonce=…` URL in your browser (the nonce is a
per-launch security key — always use the printed link). Flags after `--`:
`--rebuild` forces a UI build, `--no-open` skips the browser, `--port <n>`
pins the port.

Working state lives under `~/.local/state/whp-script-creator/`; durable
milestones are written to the repository only through explicit actions in
the UI.
