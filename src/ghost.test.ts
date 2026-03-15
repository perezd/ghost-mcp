// src/ghost.test.ts
import { test, expect } from "bun:test";
import { createJwt, GhostClient } from "./ghost.ts";

test("createJwt produces a valid 3-part JWT", async () => {
  const token = await createJwt("my-key-id", "abcdef1234567890abcdef1234567890");
  const parts = token.split(".");
  expect(parts.length).toBe(3);

  // Decode header
  const header = JSON.parse(atob(parts[0]!.replace(/-/g, "+").replace(/_/g, "/")));
  expect(header.alg).toBe("HS256");
  expect(header.typ).toBe("JWT");
  expect(header.kid).toBe("my-key-id");

  // Decode payload
  const payload = JSON.parse(atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/")));
  expect(payload.iat).toBeNumber();
  expect(payload.exp).toBeNumber();
  expect(payload.exp - payload.iat).toBe(300); // 5 minutes
  expect(payload.aud).toBe("/admin/");
});

test("GhostClient constructs correct base URL", () => {
  const client = new GhostClient("https://myblog.com", "id:secret", "v6.0");
  expect(client.baseUrl).toBe("https://myblog.com/ghost/api/admin/");
});

test("GhostClient parses apiKey into id and secret", () => {
  const client = new GhostClient("https://myblog.com", "myid:mysecret", "v6.0");
  expect(client.keyId).toBe("myid");
  expect(client.keySecret).toBe("mysecret");
});

test("GhostClient throws on malformed apiKey", () => {
  expect(() => new GhostClient("https://myblog.com", "badkey", "v6.0")).toThrow(
    "Invalid API key format"
  );
});
