// src/server.test.ts
import { test, expect } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { GhostClient } from "./ghost.ts";
import { createServer } from "./server.ts";

function createTestSetup() {
  // Client will never make real HTTP calls — we just need a valid GhostClient instance
  const client = new GhostClient("https://fake.ghost.io", "aaaa:bbbbccccddddeeeeffffaaaa11112222", "v6.0");
  const server = createServer(client);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  return { server, client: new Client({ name: "test-client", version: "1.0.0" }), clientTransport, serverTransport };
}

test("server lists all 5 tools", async () => {
  const { server, client, clientTransport, serverTransport } = createTestSetup();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();

  expect(names).toEqual([
    "create_post",
    "delete_post",
    "get_post",
    "list_posts",
    "update_post",
  ]);

  await client.close();
  await server.close();
});

test("list_posts tool has correct input schema", async () => {
  const { server, client, clientTransport, serverTransport } = createTestSetup();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const { tools } = await client.listTools();
  const listPosts = tools.find((t) => t.name === "list_posts");

  expect(listPosts).toBeDefined();
  expect(listPosts!.inputSchema.properties).toHaveProperty("filter");
  expect(listPosts!.inputSchema.properties).toHaveProperty("limit");
  expect(listPosts!.inputSchema.properties).toHaveProperty("page");
  expect(listPosts!.inputSchema.properties).toHaveProperty("order");

  await client.close();
  await server.close();
});
