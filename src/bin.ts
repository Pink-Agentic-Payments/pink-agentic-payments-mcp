#!/usr/bin/env node
import { runBridge, DEFAULT_PINK_MCP_URL } from "./bridge.js";
import { createSandboxAndPrint } from "./create-sandbox.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--create-sandbox") || args[0] === "init") {
    await createSandboxAndPrint();
    return;
  }

  const agentKey = process.env.PINK_AGENT_API_KEY;
  if (!agentKey) {
    process.stderr.write(
      "[pink-agentic-payments-mcp] Missing PINK_AGENT_API_KEY.\n" +
        "Get a free sandbox key by running: npx -y pink-agentic-payments-mcp --create-sandbox\n",
    );
    process.exit(1);
  }

  const remoteUrl = process.env.PINK_MCP_URL ?? DEFAULT_PINK_MCP_URL;

  try {
    await runBridge({ agentKey: agentKey!, remoteUrl });
  } catch (err) {
    process.stderr.write(
      `[pink-agentic-payments-mcp] failed to start: ${
        err instanceof Error ? err.message : String(err)
      }\n`,
    );
    process.exit(1);
  }
}

main();
