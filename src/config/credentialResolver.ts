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

export const DIRECT_ENV_VARS = [
  "TURBOT_GRAPHQL_ENDPOINT",
  "TURBOT_ACCESS_KEY_ID",
  "TURBOT_SECRET_ACCESS_KEY",
] as const;

const GRAPHQL_PATH = "/api/latest/graphql";

export function defaultCredentialsPath(): string {
  return path.join(os.homedir(), ".config", "turbot", "credentials.yml");
}

// Accepts either a workspace URL (e.g. https://demo.cloud.turbot.com) or a
// fully-qualified GraphQL endpoint, with or without trailing slashes.
export function buildGraphqlEndpoint(input: string): string {
  const trimmed = input.replace(/\/+$/, "");
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
export function resolveConfig(options: ResolveOptions = {}): Config {
  const env = options.env ?? process.env;
  const readFile = options.readFile ?? defaultReadFile;

  if (env.TURBOT_CLI_PROFILE) {
    return loadFromCliProfile(env.TURBOT_CLI_PROFILE, env, readFile);
  }
  return loadFromDirectEnv(env);
}

function loadFromCliProfile(
  profile: string,
  env: NodeJS.ProcessEnv,
  readFile: (filePath: string) => string,
): Config {
  const credentialsPath =
    env.TURBOT_CLI_CREDENTIALS_PATH || defaultCredentialsPath();

  let fileContent: string;
  try {
    fileContent = readFile(credentialsPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to read credentials file ${credentialsPath}: ${message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(fileContent);
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
  if (!Object.prototype.hasOwnProperty.call(profiles, profile)) {
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
    TURBOT_GRAPHQL_ENDPOINT: buildGraphqlEndpoint(credentials.workspace!),
    TURBOT_ACCESS_KEY_ID: credentials.accessKey!,
    TURBOT_SECRET_ACCESS_KEY: credentials.secretKey!,
  };
}

function loadFromDirectEnv(env: NodeJS.ProcessEnv): Config {
  const missing = DIRECT_ENV_VARS.filter((v) => !env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for direct credentials: [${missing.join(", ")}].\n` +
        `Alternatively, set TURBOT_CLI_PROFILE to use a Turbot CLI credentials profile.`,
    );
  }

  return {
    TURBOT_GRAPHQL_ENDPOINT: buildGraphqlEndpoint(env.TURBOT_GRAPHQL_ENDPOINT!),
    TURBOT_ACCESS_KEY_ID: env.TURBOT_ACCESS_KEY_ID!,
    TURBOT_SECRET_ACCESS_KEY: env.TURBOT_SECRET_ACCESS_KEY!,
  };
}
