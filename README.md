# pink-agentic-payments-mcp

Pink Agentic AI Payments checks every payment an agent requests against company spending rules (budgets, payee allow-lists, human approval) before any payment credential is issued.

This package is a local **stdio** MCP server that bridges any MCP client (Claude Desktop, Cursor, VS Code, Windsurf, n8n's MCP client, and others) to Pink's remote Streamable HTTP MCP server. It forwards `tools/list` and `tools/call` (and resources/prompts, if the remote adds them) transparently, so the local server always reflects whatever tools Pink's remote server currently exposes — nothing is hardcoded.

Sandbox preview: test money only, no signup required to get a key.

## Quick start

### 1. Get a free sandbox agent key

No signup needed. Either run:

```bash
npx -y pink-agentic-payments-mcp --create-sandbox
```

which creates a sandbox workspace and prints a ready-to-paste client config, or create one yourself:

```bash
curl -s -X POST https://agentic-sandbox.pinkwallet.com/v1/sandbox/workspaces
```

and take any `agents[].key` from the response.

### 2. Add it to your MCP client

**Claude Desktop** (`claude_desktop_config.json`), **Cursor**, **Windsurf**, and most other stdio-based MCP clients:

```json
{
  "mcpServers": {
    "pink": {
      "command": "npx",
      "args": ["-y", "pink-agentic-payments-mcp"],
      "env": { "PINK_AGENT_API_KEY": "pk_sandbox_agent_..." }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "pink": {
      "command": "npx",
      "args": ["-y", "pink-agentic-payments-mcp"],
      "env": { "PINK_AGENT_API_KEY": "${input:pink_agent_key}" }
    }
  }
}
```

Env vars:

- `PINK_AGENT_API_KEY` (required) — your agent key from a sandbox workspace.
- `PINK_MCP_URL` (optional) — defaults to `https://agentic-sandbox.pinkwallet.com/mcp`.

## Tools

These are live from the remote server's `tools/list` response (see [`TEST-OUTPUT.txt`](./TEST-OUTPUT.txt) for the full run):

| Tool | What it does |
| --- | --- |
| `pink.get_budget` | What this agent may still spend: monthly budget left, spent today, single-payment cap, vault balances, company daily ceiling. |
| `pink.list_payees` | Suppliers, platforms and contractors this company has approved. Paying anyone else stops and asks a person. |
| `pink.list_rules` | The policy rules that apply to this agent, in evaluation order. First match decides: allow, ask, or block. |
| `pink.check_policy` | Dry run. Returns `would_allow` / `would_ask` / `would_block` with the rule and full decision trace. Nothing is spent or held. |
| `pink.request_payment` | The real call. Returns `allowed` with a single-use credential, `pending_human` with a `hold_id` while a person is asked, or `blocked` with the reason. |
| `pink.get_credential` | Poll a pending hold. Once a person approves, this returns the credential. |
| `pink.report_receipt` | File the receipt for a completed payment so it reconciles. |

## How this was tested

`TEST-OUTPUT.txt` in this repo is the full, unedited output of three real runs against a live sandbox workspace (test money only):

1. The built server (`dist/bin.js`) driven over stdio by an MCP SDK test client — `tools/list` plus `pink.request_payment` calls that returned real `allowed` (with an issued sandbox credential), `blocked` (over monthly budget), and `pending_human` (new-payee approval) decisions.
2. The official MCP Inspector CLI (`npx @modelcontextprotocol/inspector --cli`) run headless against the same built server.
3. The same stdio test run again from a packed tarball (`npm pack` then `npx -y ./pink-agentic-payments-mcp-0.1.0.tgz`) in a clean directory, to prove the `npx` install path works end to end.

## Links

- Docs hub: [pinkwallet.com/agentic/developers](https://pinkwallet.com/agentic/developers/)
- MCP connection guide: [pinkwallet.com/agentic/developers/connect-via-mcp](https://pinkwallet.com/agentic/developers/connect-via-mcp/)
- JS/TS client: [pink-agentic-payments](https://github.com/Pink-Agentic-Payments/pink-agentic-payments-js)

## Status

Sandbox preview. This package is not yet published to npm — install it for now by cloning this repo and running `npm install && npm run build`, or build the tarball yourself with `npm pack`.

## License

MIT
