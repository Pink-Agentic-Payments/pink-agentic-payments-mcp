const SANDBOX_WORKSPACES_URL =
  "https://agentic-sandbox.pinkwallet.com/v1/sandbox/workspaces";

export async function createSandboxAndPrint(): Promise<void> {
  const res = await fetch(SANDBOX_WORKSPACES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  if (!res.ok) {
    process.stderr.write(
      `Failed to create sandbox workspace: ${res.status} ${res.statusText}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const workspace = (await res.json()) as {
    workspace_id: string;
    agents: Array<{ id: string; name: string; key: string }>;
  };

  const agent = workspace.agents[0];

  console.log(`Sandbox workspace created: ${workspace.workspace_id}`);
  console.log(`Using agent: ${agent.name} (${agent.id})`);
  console.log("");
  console.log("Set this environment variable, then add the MCP config below:");
  console.log("");
  console.log(`  export PINK_AGENT_API_KEY=${agent.key}`);
  console.log("");
  console.log("MCP client config (Claude Desktop, Cursor, VS Code, etc.):");
  console.log("");
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          pink: {
            command: "npx",
            args: ["-y", "pink-agentic-payments-mcp"],
            env: { PINK_AGENT_API_KEY: agent.key },
          },
        },
      },
      null,
      2,
    ),
  );
  console.log("");
  console.log("Sandbox only: test money, no signup, credentials shown once.");
}
