import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const DEFAULT_PINK_MCP_URL = "https://agentic-sandbox.pinkwallet.com/mcp";

export interface BridgeOptions {
  agentKey: string;
  remoteUrl?: string;
}

/**
 * Connects to the remote Pink Agentic AI Payments MCP server (Streamable HTTP)
 * and returns a client whose capabilities reflect whatever the remote exposes
 * today, so the local bridge never has to hardcode a tool list.
 */
async function connectUpstream(opts: BridgeOptions): Promise<Client> {
  const url = new URL(opts.remoteUrl ?? DEFAULT_PINK_MCP_URL);
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${opts.agentKey}`,
      },
    },
  });

  const client = new Client({
    name: "pink-agentic-payments-mcp-bridge",
    version: "0.1.0",
  });

  await client.connect(transport);
  return client;
}

/**
 * Forwards any JSON-RPC request verbatim to the upstream client. This keeps
 * the bridge in sync automatically if Pink adds/changes tools, resources or
 * prompts on the remote server, since nothing here is hardcoded.
 */
function makeFallbackHandler(getUpstream: () => Client) {
  return async (request: JSONRPCRequest) => {
    const upstream = getUpstream();
    return upstream.request(
      { method: request.method, params: request.params } as any,
      z.any(),
    );
  };
}

export async function runBridge(opts: BridgeOptions): Promise<void> {
  let upstream = await connectUpstream(opts);
  let reconnectedOnce = false;

  const server = new Server(
    {
      name: "pink-agentic-payments-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  server.fallbackRequestHandler = async (request) => {
    try {
      return await makeFallbackHandler(() => upstream)(request);
    } catch (err) {
      if (!reconnectedOnce) {
        reconnectedOnce = true;
        process.stderr.write(
          "[pink-agentic-payments-mcp] upstream connection dropped, reconnecting once...\n",
        );
        try {
          upstream = await connectUpstream(opts);
          return await makeFallbackHandler(() => upstream)(request);
        } catch (reconnectErr) {
          throw reconnectErr;
        }
      }
      throw err;
    }
  };

  const stdio = new StdioServerTransport();
  await server.connect(stdio);

  process.stderr.write(
    `[pink-agentic-payments-mcp] bridging stdio <-> ${opts.remoteUrl ?? DEFAULT_PINK_MCP_URL}\n`,
  );
}
