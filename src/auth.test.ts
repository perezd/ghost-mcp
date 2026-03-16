import { test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig, saveConfig, getSiteConfig, type GhostConfig } from "./auth.ts";
import { join } from "path";

const TEST_DIR = join(import.meta.dir, "../.test-ghost-mcp");
const TEST_CONFIG_PATH = join(TEST_DIR, "config.json");

beforeEach(async () => {
  await Bun.$`mkdir -p ${TEST_DIR}`;
});

afterEach(async () => {
  await Bun.$`rm -rf ${TEST_DIR}`;
});

test("loadConfig returns empty config when file does not exist", async () => {
  const config = await loadConfig(TEST_CONFIG_PATH);
  expect(config).toEqual({ default: "", sites: {} });
});

test("saveConfig writes and loadConfig reads back", async () => {
  const config: GhostConfig = {
    default: "https://myblog.com",
    sites: {
      "https://myblog.com": {
        apiKey: "id:secret",
        apiVersion: "v6.0",
      },
    },
  };
  await saveConfig(config, TEST_CONFIG_PATH);
  const loaded = await loadConfig(TEST_CONFIG_PATH);
  expect(loaded).toEqual(config);
});

test("getSiteConfig returns site for default URL", async () => {
  const config: GhostConfig = {
    default: "https://myblog.com",
    sites: {
      "https://myblog.com": {
        apiKey: "id:secret",
        apiVersion: "v6.0",
      },
    },
  };
  await saveConfig(config, TEST_CONFIG_PATH);

  const result = await getSiteConfig(undefined, TEST_CONFIG_PATH);
  expect(result.url).toBe("https://myblog.com");
  expect(result.apiKey).toBe("id:secret");
  expect(result.apiVersion).toBe("v6.0");
});

test("getSiteConfig returns site for explicit URL", async () => {
  const config: GhostConfig = {
    default: "https://myblog.com",
    sites: {
      "https://myblog.com": {
        apiKey: "id1:secret1",
        apiVersion: "v6.0",
      },
      "https://staging.myblog.com": {
        apiKey: "id2:secret2",
        apiVersion: "v6.0",
      },
    },
  };
  await saveConfig(config, TEST_CONFIG_PATH);

  const result = await getSiteConfig("https://staging.myblog.com", TEST_CONFIG_PATH);
  expect(result.url).toBe("https://staging.myblog.com");
  expect(result.apiKey).toBe("id2:secret2");
});

test("GHOST_MCP_CONFIG env var overrides default config path", async () => {
  const config: GhostConfig = {
    default: "https://env-site.com",
    sites: {
      "https://env-site.com": {
        apiKey: "env-id:env-secret",
        apiVersion: "v6.0",
      },
    },
  };
  await saveConfig(config, TEST_CONFIG_PATH);

  const original = process.env.GHOST_MCP_CONFIG;
  process.env.GHOST_MCP_CONFIG = TEST_CONFIG_PATH;
  try {
    // Call without explicit configPath — should use env var
    const result = await getSiteConfig(undefined);
    expect(result.url).toBe("https://env-site.com");
    expect(result.apiKey).toBe("env-id:env-secret");
  } finally {
    if (original === undefined) delete process.env.GHOST_MCP_CONFIG;
    else process.env.GHOST_MCP_CONFIG = original;
  }
});

test("getSiteConfig throws when no config exists", async () => {
  await expect(getSiteConfig(undefined, TEST_CONFIG_PATH)).rejects.toThrow(
    "No Ghost sites configured"
  );
});

test("getSiteConfig throws when site not found", async () => {
  const config: GhostConfig = {
    default: "https://myblog.com",
    sites: {
      "https://myblog.com": {
        apiKey: "id:secret",
        apiVersion: "v6.0",
      },
    },
  };
  await saveConfig(config, TEST_CONFIG_PATH);

  await expect(
    getSiteConfig("https://unknown.com", TEST_CONFIG_PATH)
  ).rejects.toThrow("Site https://unknown.com not found");
});
