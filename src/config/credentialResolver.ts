import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export interface Config {
  TURBOT_GRAPHQL_ENDPOINT: string;
  TURBOT_ACCESS_KEY_ID: string;
  TURBOT_SECRET_ACCESS_KEY: string;
}

interface CliProfileCredentials {
  workspace: string;
  accessKey: string;
  secretKey: string;
}

export type AuthMethod = "cli-profile" | "direct-env";

export interface ResolvedConfig {
  config: Config;
  authMethod: AuthMethod;
  profile?: string;
  credentialsPath?: string;
}

export const DIRECT_ENV_VARS = [
  "TURBOT_GRAPHQL_ENDPOINT",
  "TURBOT_ACCESS_KEY_ID",
  "TURBOT_SECRET_ACCESS_KEY",
] as const;

const GRAPHQL_PATH = "/api/latest/graphql";

export function defaultCredentialsPath(): string {
  return path.join(os.homedir(), ".config", "turbot", "credentials.yml");
}

// Expands a leading ~ in a path to the user's home directory. Needed because
// AI-assistant configs (Claude Desktop, Cursor) embed env values as JSON
// strings, with no shell to expand ~ for the user. Handles both / and \ so
// JSON-config users on Windows aren't surprised.
export function expandTilde(input: string): string {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

// Accepts either a workspace URL (e.g. https://demo.cloud.turbot.com) or a
// fully-qualified GraphQL endpoint, with or without trailing slashes or
// surrounding whitespace.
export function buildGraphqlEndpoint(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return trimmed.endsWith(GRAPHQL_PATH) ? trimmed : `${trimmed}${GRAPHQL_PATH}`;
}

export interface ResolveOptions {
  env?: NodeJS.ProcessEnv;
  readFile?: (filePath: string) => string;
}

const defaultReadFile = (filePath: string): string =>
  readFileSync(filePath, "utf8");

// Resolves a Config from environment. CLI profile (TURBOT_CLI_PROFILE) takes
// precedence over direct env vars when both are set — the user has expressed
// explicit intent to use the profile, so we honour it without falling back.
// Returns the resolved config along with metadata about which method was used,
// so callers (e.g. startup logging) can show the user which path they took
// without needing to re-derive it.
export function resolveConfig(options: ResolveOptions = {}): ResolvedConfig {
  const env = options.env ?? process.env;
  const readFile = options.readFile ?? defaultReadFile;

  const rawProfile = env.TURBOT_CLI_PROFILE?.trim();
  if (rawProfile) {
    return loadFromCliProfile(rawProfile, env, readFile);
  }
  return loadFromDirectEnv(env);
}

function loadFromCliProfile(
  profile: string,
  env: NodeJS.ProcessEnv,
  readFile: (filePath: string) => string,
): ResolvedConfig {
  const rawPath = env.TURBOT_CLI_CREDENTIALS_PATH?.trim();
  const credentialsPath = rawPath
    ? expandTilde(rawPath)
    : defaultCredentialsPath();

  let fileContent: string;
  try {
    fileContent = readFile(credentialsPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to read credentials file ${credentialsPath}: ${message}`,
    );
  }

  // Strip a UTF-8 BOM if present — `yaml` parses BOM-less content reliably,
  // and editors on Windows sometimes save credentials.yml with a BOM.
  if (fileContent.charCodeAt(0) === 0xfeff) {
    fileContent = fileContent.slice(1);
  }

  let parsed: unknown;
  try {
    // merge: true enables YAML 1.1 merge keys (<<: *anchor) so users who
    // organise credentials.yml with shared anchors get the expected values.
    parsed = parseYaml(fileContent, { merge: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML in ${credentialsPath}: ${message}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `Credentials file ${credentialsPath} is not a valid YAML mapping`,
    );
  }

  const profiles = parsed as Record<string, unknown>;
  if (!Object.hasOwn(profiles, profile)) {
    throw new Error(
      `Profile '${profile}' not found in credentials file ${credentialsPath}`,
    );
  }

  const entry = profiles[profile];
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(
      `Profile '${profile}' in ${credentialsPath} is not a valid mapping`,
    );
  }

  const credentials = entry as Partial<CliProfileCredentials>;
  const requiredFields: (keyof CliProfileCredentials)[] = [
    "workspace",
    "accessKey",
    "secretKey",
  ];
  const missing = requiredFields.filter((field) => !credentials[field]);
  if (missing.length > 0) {
    throw new Error(
      `Profile '${profile}' in ${credentialsPath} is missing required field(s): ${missing.join(", ")}`,
    );
  }

  return {
    config: {
      TURBOT_GRAPHQL_ENDPOINT: buildGraphqlEndpoint(credentials.workspace!),
      TURBOT_ACCESS_KEY_ID: credentials.accessKey!,
      TURBOT_SECRET_ACCESS_KEY: credentials.secretKey!,
    },
    authMethod: "cli-profile",
    profile,
    credentialsPath,
  };
}

function loadFromDirectEnv(env: NodeJS.ProcessEnv): ResolvedConfig {
  const missing = DIRECT_ENV_VARS.filter((v) => !env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for direct credentials: [${missing.join(", ")}].\n` +
        `Alternatively, set TURBOT_CLI_PROFILE to use a Turbot CLI credentials profile.`,
    );
  }

  return {
    config: {
      TURBOT_GRAPHQL_ENDPOINT: buildGraphqlEndpoint(env.TURBOT_GRAPHQL_ENDPOINT!),
      TURBOT_ACCESS_KEY_ID: env.TURBOT_ACCESS_KEY_ID!,
      TURBOT_SECRET_ACCESS_KEY: env.TURBOT_SECRET_ACCESS_KEY!,
    },
    authMethod: "direct-env",
  };
}
