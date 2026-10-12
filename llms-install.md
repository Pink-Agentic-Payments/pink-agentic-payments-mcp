# Installing pink-agentic-payments-mcp

This guide is for AI agents (e.g. Cline) installing this MCP server on behalf of a user. It assumes only shell access and an MCP client config file — no manual signup is required.

## What this server does

`pink-agentic-payments-mcp` is a local stdio MCP server. It bridges your MCP client to Pink's remote MCP server and exposes 7 tools that check a payment request against a company's spending rules (budgets, payee allow-lists, human approval) before issuing a payment credential: `pink.get_budget`, `pink.list_payees`, `pink.list_rules`, `pink.check_policy`, `pink.request_payment`, `pink.get_credential`, `pink.report_receipt`.

This is a sandbox preview — all payments are test money, there is no real money movement.

## Step 1: Get a sandbox agent key

No signup, no account, no payment details needed. Run:

```bash
npx -y pink-agentic-payments-mcp --create-sandbox
```

This creates a free sandbox workspace and prints a ready-to-paste MCP client config block, including the `PINK_AGENT_API_KEY` value (format `pk_sandbox_agent_...`).

Alternatively, create a sandbox workspace with a direct API call and take any `agents[].key` from the JSON response:

```bash
curl -s -X POST https://agentic-sandbox.pinkwallet.com/v1/sandbox/workspaces
```

## Step 2: Add the server to the MCP client config

Add this block to the client's MCP server config (e.g. `claude_desktop_config.json`, or the equivalent `mcpServers` section used by Cline):

```json
{
  "mcpServers": {
    "pink": {
      "command": "npx",
      "args": ["-y", "pink-agentic-payments-mcp"],
      "env": { "PINK_AGENT_API_KEY": "pk_sandbox_agent_REPLACE_ME" }
    }
  }
}
```

Replace `pk_sandbox_agent_REPLACE_ME` with the key obtained in Step 1. No build step, no clone, no local install — `npx` fetches the published npm package (`pink-agentic-payments-mcp`) at run time.

## Step 3: Verify it is working

Restart/reload the MCP client so it picks up the new server, then call `tools/list` on the `pink` server. You should see the 7 tools listed above. Calling `pink.get_budget` with no arguments should return a JSON object describing the sandbox agent's budget and vault balances.

## Troubleshooting

- "Missing PINK_AGENT_API_KEY" error on startup: the env var was not set in the client config, or the key was not copied correctly from Step 1.
- To point at a different Pink MCP deployment, set the optional `PINK_MCP_URL` env var (defaults to `https://agentic-sandbox.pinkwallet.com/mcp`).
