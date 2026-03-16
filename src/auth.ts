import { join, dirname } from "path";
import { homedir } from "os";

export interface SiteConfig {
  apiKey: string;
  apiVersion: string;
}

export interface GhostConfig {
  default: string;
  sites: Record<string, SiteConfig>;
}

function defaultConfigPath(): string {
  return process.env.GHOST_MCP_CONFIG ?? join(homedir(), ".ghost-mcp", "config.json");
}

export async function loadConfig(
  configPath: string = defaultConfigPath()
): Promise<GhostConfig> {
  const file = Bun.file(configPath);
  if (!(await file.exists())) {
    return { default: "", sites: {} };
  }
  return (await file.json()) as GhostConfig;
}

export async function saveConfig(
  config: GhostConfig,
  configPath: string = defaultConfigPath()
): Promise<void> {
  const dir = dirname(configPath);
  await Bun.$`mkdir -p ${dir}`;
  await Bun.write(configPath, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

export async function getSiteConfig(
  url: string | undefined,
  configPath: string = defaultConfigPath()
): Promise<SiteConfig & { url: string }> {
  const config = await loadConfig(configPath);

  if (Object.keys(config.sites).length === 0) {
    throw new Error(
      "No Ghost sites configured. Run `ghost-mcp auth` to add one."
    );
  }

  const siteUrl = url ?? config.default;

  if (!siteUrl || !config.sites[siteUrl]) {
    throw new Error(
      `Site ${siteUrl || "(none)"} not found in config. Run \`ghost-mcp auth\` to add it.`
    );
  }

  return { url: siteUrl, ...config.sites[siteUrl] };
}
