#!/usr/bin/env node
import readline from "node:readline";
import { tools } from "./tools/definitions.mjs";
import { callTool } from "./tools/handlers.mjs";

const SERVER_INFO = {
  name: "portfolio-publisher-mcp",
  version: "0.1.0",
};

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function respondError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

async function handleRequest(message) {
  if (!message || typeof message !== "object") return;
  if (!("id" in message)) return;

  try {
    if (message.method === "initialize") {
      const requestedVersion = message.params?.protocolVersion ?? "2025-06-18";
      respond(message.id, {
        protocolVersion: requestedVersion,
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: SERVER_INFO,
        instructions:
          "Use this server to inspect and safely prepare Anshul's portfolio Lab projects. This first version is read-only.",
      });
      return;
    }

    if (message.method === "tools/list") {
      respond(message.id, { tools });
      return;
    }

    if (message.method === "tools/call") {
      const result = await callTool(message.params?.name, message.params?.arguments ?? {});
      respond(message.id, result);
      return;
    }

    if (message.method === "ping") {
      respond(message.id, {});
      return;
    }

    respondError(message.id, -32601, `Method not found: ${message.method}`);
  } catch (error) {
    respondError(message.id, -32000, error instanceof Error ? error.message : String(error));
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    const message = JSON.parse(line);
    void handleRequest(message);
  } catch {
    respondError(null, -32700, "Parse error");
  }
});
