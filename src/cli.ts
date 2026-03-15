#!/usr/bin/env bun
// src/cli.ts

import { loadConfig, saveConfig, getSiteConfig } from "./auth.ts";
import { GhostClient } from "./ghost.ts";
import { createServer } from "./server.ts";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function promptLine(message: string): Promise<string> {
  process.stdout.write(message);
  for await (const line of console) {
    return line;
  }
  return "";
}

async function authCommand(args: string[]): Promise<void> {
  let url = args[0];

  if (!url) {
    url = await promptLine("Ghost site URL: ");
  }

  if (!url) {
    console.error("Error: URL is required.");
    process.exit(1);
  }

  // Normalize URL
  url = url.replace(/\/+$/, "");

  const apiKey = await promptLine("Admin API key (id:secret): ");
  if (!apiKey || !apiKey.includes(":")) {
    console.error("Error: API key must be in 'id:secret' format.");
    process.exit(1);
  }

  const versionInput = await promptLine("API version (default: v6.0): ");
  const apiVersion = versionInput || "v6.0";

  const config = await loadConfig();
  config.sites[url] = { apiKey, apiVersion };
  config.default = url;
  await saveConfig(config);

  console.log(`Authenticated ${url} (set as default).`);
}

async function serveCommand(args: string[]): Promise<void> {
  let url: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) {
      url = args[i + 1];
    }
  }

  const site = await getSiteConfig(url);
  const client = new GhostClient(site.url, site.apiKey, site.apiVersion);
  const server = createServer(client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "auth":
    await authCommand(args);
    break;
  case "serve":
    await serveCommand(args);
    break;
  default:
    console.log("Usage: ghost-mcp <command>\n");
    console.log("Commands:");
    console.log("  auth [url]    Authenticate with a Ghost site");
    console.log("  serve         Start MCP server (stdio)");
    console.log("\nOptions for serve:");
    console.log("  --url <url>   Use a specific site instead of default");
    process.exit(command ? 1 : 0);
}
