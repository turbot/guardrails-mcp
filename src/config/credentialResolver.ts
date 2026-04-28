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

// Env var name pairs: [preferred (Turbot CLI-aligned), legacy (v0.1.x MCP)].
// The preferred name is checked first; if unset, we fall back to the legacy
// name. This lets users configured for the Turbot CLI use the MCP without
// re-defining their credentials, while keeping existing v0.1.x configs working.
const ENV_ALIAS_WORKSPACE = ["TURBOT_WORKSPACE", "TURBOT_GRAPHQL_ENDPOINT"] as const;
const ENV_ALIAS_ACCESS_KEY = ["TURBOT_ACCESS_KEY", "TURBOT_ACCESS_KEY_ID"] as const;
const ENV_ALIAS_SECRET_KEY = ["TURBOT_SECRET_KEY", "TURBOT_SECRET_ACCESS_KEY"] as const;
const ENV_ALIAS_PROFILE = ["TURBOT_PROFILE", "TURBOT_CLI_PROFILE"] as const;

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

// Reads a single logical credential from the environment, checking each name
// in order. Empty / whitespace-only values are treated as unset. Returns the
// first non-empty trimmed value, or undefined if none of the names is set.
function readWithAliases(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const raw = env[name];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

export interface ResolveOptions {
  env?: NodeJS.ProcessEnv;
  readFile?: (filePath: string) => string;
}

const defaultReadFile = (filePath: string): string =>
  readFileSync(filePath, "utf8");

// Resolves a Config from environment.
//
// Precedence (matches the Turbot CLI):
//   1. If all three direct credentials are present (TURBOT_WORKSPACE,
//      TURBOT_ACCESS_KEY, TURBOT_SECRET_KEY — or any legacy aliases for the
//      same logical fields), use those.
//   2. Else if a profile is named (TURBOT_PROFILE or TURBOT_CLI_PROFILE),
//      load credentials from the Turbot CLI credentials file.
//   3. Else: throw with a clear error mentioning both options.
//
// Each logical credential accepts either the CLI-aligned name or the v0.1.x
// legacy name. A mid-migration mixed config (e.g. TURBOT_WORKSPACE +
// TURBOT_ACCESS_KEY_ID + TURBOT_SECRET_KEY) works correctly.
export function resolveConfig(options: ResolveOptions = {}): ResolvedConfig {
  const env = options.env ?? process.env;
  const readFile = options.readFile ?? defaultReadFile;

  const workspace = readWithAliases(env, ENV_ALIAS_WORKSPACE);
  const accessKey = readWithAliases(env, ENV_ALIAS_ACCESS_KEY);
  const secretKey = readWithAliases(env, ENV_ALIAS_SECRET_KEY);

  if (workspace && accessKey && secretKey) {
    return {
      config: {
        TURBOT_GRAPHQL_ENDPOINT: buildGraphqlEndpoint(workspace),
        TURBOT_ACCESS_KEY_ID: accessKey,
        TURBOT_SECRET_ACCESS_KEY: secretKey,
      },
      authMethod: "direct-env",
    };
  }

  const profile = readWithAliases(env, ENV_ALIAS_PROFILE);
  if (profile) {
    return loadFromCliProfile(profile, env, readFile);
  }

  throw new Error(missingCredentialsMessage());
}

function missingCredentialsMessage(): string {
  return (
    "Missing required Turbot credentials.\n" +
    "Set ONE of the following:\n" +
    "  - TURBOT_PROFILE (use a profile from your Turbot CLI credentials file at " +
    "~/.config/turbot/credentials.yml; override the path with TURBOT_CLI_CREDENTIALS_PATH)\n" +
    "  - TURBOT_WORKSPACE, TURBOT_ACCESS_KEY, and TURBOT_SECRET_KEY (direct credentials)\n" +
    "Legacy v0.1.x names are also accepted: TURBOT_CLI_PROFILE / " +
    "TURBOT_GRAPHQL_ENDPOINT / TURBOT_ACCESS_KEY_ID / TURBOT_SECRET_ACCESS_KEY."
  );
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
