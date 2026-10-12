import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResultSchema, CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

const AGENT_KEY = process.env.PINK_AGENT_API_KEY;
if (!AGENT_KEY) {
  console.error("Set PINK_AGENT_API_KEY first");
  process.exit(1);
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.env.TEST_BIN_COMMAND ?? "node",
    args: process.env.TEST_BIN_ARGS ? process.env.TEST_BIN_ARGS.split(" ") : ["dist/bin.js"],
    env: {
      ...process.env,
      PINK_AGENT_API_KEY: AGENT_KEY!,
    } as Record<string, string>,
    stderr: "pipe",
  });

  const client = new Client({ name: "pink-mcp-test-client", version: "0.0.1" });
  await client.connect(transport);

  transport.stderr?.on("data", (d) => process.stdout.write(`[server stderr] ${d}`));

  console.log("=== tools/list ===");
  const tools = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema);
  console.log(JSON.stringify(tools, null, 2));

  console.log("\n=== pink.get_budget ===");
  const budget = await client.request(
    { method: "tools/call", params: { name: "pink.get_budget", arguments: {} } },
    CallToolResultSchema,
  );
  console.log(JSON.stringify(budget, null, 2));

  console.log("\n=== pink.list_payees ===");
  const payees = await client.request(
    { method: "tools/call", params: { name: "pink.list_payees", arguments: {} } },
    CallToolResultSchema,
  );
  console.log(JSON.stringify(payees, null, 2));

  console.log("\n=== pink.request_payment: ALLOWED case (small amount, known payee, under caps) ===");
  const allowedCheck = await client.request(
    {
      method: "tools/call",
      params: {
        name: "pink.request_payment",
        arguments: {
          amount: 25,
          payee_id: "p_cc",
          purpose: "test allowed small payment",
          idempotency_key: "test-allowed-1",
        },
      },
    },
    CallToolResultSchema,
  );
  console.log(JSON.stringify(allowedCheck, null, 2));

  console.log("\n=== pink.request_payment: BLOCKED case (amount over monthly budget left) ===");
  const blockedCheck = await client.request(
    {
      method: "tools/call",
      params: {
        name: "pink.request_payment",
        arguments: {
          amount: 999999,
          payee_id: "p_cc",
          purpose: "test over-budget blocked payment",
          idempotency_key: "test-blocked-1",
        },
      },
    },
    CallToolResultSchema,
  );
  console.log(JSON.stringify(blockedCheck, null, 2));

  console.log("\n=== pink.request_payment: PENDING_HUMAN case (new/unlisted payee triggers owner approval) ===");
  const pendingCheck = await client.request(
    {
      method: "tools/call",
      params: {
        name: "pink.request_payment",
        arguments: {
          amount: 60,
          payee_name: "A New Supplier Not On The List",
          purpose: "test approval-threshold payment",
          idempotency_key: "test-pending-1",
        },
      },
    },
    CallToolResultSchema,
  );
  console.log(JSON.stringify(pendingCheck, null, 2));

  await client.close();
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
