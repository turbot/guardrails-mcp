import dotenv from "dotenv";
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";

// Load environment variables from .env file
dotenv.config();

// Credential variable groups
const directEnvVars = [
  "TURBOT_GRAPHQL_ENDPOINT",
  "TURBOT_ACCESS_KEY_ID",
  "TURBOT_SECRET_ACCESS_KEY",
];

const CLI_CREDENTIALS_DEFAULT_PATH = process.env.HOME
  ? `${process.env.HOME}/.config/turbot/credentials.yml`
  : null;

// Detect which credential method(s) the user has configured
const hasDirectEnvVars = directEnvVars.every((v) => !!process.env[v]);

let hasCliCredentialVars = false;
if (process.env["TURBOT_CLI_PROFILE"]) {
  if (CLI_CREDENTIALS_DEFAULT_PATH || process.env["TURBOT_CLI_CREDENTIALS_PATH"]) {
    hasCliCredentialVars = true;
  } else {
    throw new Error(
      `TURBOT_CLI_CREDENTIALS_PATH is required because the default credentials path could not be determined (HOME is not set).`
    );
  }
}

if (!hasDirectEnvVars && !hasCliCredentialVars) {
  if (!process.env["TURBOT_CLI_PROFILE"]) {
    throw new Error(
      `Missing required environment variables for direct credentials: [${directEnvVars.join(", ")}].\n` +
      `Alternatively, set TURBOT_CLI_PROFILE (and optionally TURBOT_CLI_CREDENTIALS_PATH if the default path is not available).`
    );
  } else {
    throw new Error(
      `Missing required environment variables for CLI credentials: TURBOT_CLI_PROFILE (and credentials file/profile must exist).\n` +
      `Alternatively, set all of [${directEnvVars.join(", ")}].`
    );
  }
}

interface Config {
  TURBOT_GRAPHQL_ENDPOINT: string;
  TURBOT_ACCESS_KEY_ID: string;
  TURBOT_SECRET_ACCESS_KEY: string;
}

interface CliProfileCredentials {
  workspace: string;
  accessKey: string;
  secretKey: string;
}

// Start with direct env vars. If CLI profile is set, it takes precedence
// (documented behavior: CLI profile overrides direct env vars when both are set).
let config: Config = {
  TURBOT_GRAPHQL_ENDPOINT: process.env.TURBOT_GRAPHQL_ENDPOINT || "",
  TURBOT_ACCESS_KEY_ID: process.env.TURBOT_ACCESS_KEY_ID || "",
  TURBOT_SECRET_ACCESS_KEY: process.env.TURBOT_SECRET_ACCESS_KEY || "",
};

if (hasCliCredentialVars) {
  const credentialsPath =
    process.env["TURBOT_CLI_CREDENTIALS_PATH"] || CLI_CREDENTIALS_DEFAULT_PATH;
  const profile = process.env["TURBOT_CLI_PROFILE"];
  if (!credentialsPath) {
    throw new Error(
      "Credentials path is not set and could not determine a default path."
    );
  }
  if (!profile) {
    throw new Error(
      "TURBOT_CLI_PROFILE is required when using CLI credentials."
    );
  }
  try {
    const fileContent = readFileSync(credentialsPath, "utf8");
    const yamlData = parseYaml(fileContent);
    if (
      !yamlData ||
      !Object.prototype.hasOwnProperty.call(yamlData, profile)
    ) {
      throw new Error(
        `Profile '${profile}' not found in credentials file: ${credentialsPath}`
      );
    }
    const profileCredentials = yamlData[profile] as Partial<CliProfileCredentials>;

    // Validate required fields are present and non-empty before use
    const requiredFields: (keyof CliProfileCredentials)[] = [
      "workspace",
      "accessKey",
      "secretKey",
    ];
    const missing = requiredFields.filter(
      (f) => !profileCredentials[f]
    );
    if (missing.length > 0) {
      throw new Error(
        `Profile '${profile}' in ${credentialsPath} is missing required field(s): ${missing.join(", ")}`
      );
    }

    // Build GraphQL endpoint: strip trailing slash, then append /api/latest/graphql if not already present
    let endpoint = profileCredentials.workspace!;
    if (endpoint.endsWith("/")) {
      endpoint = endpoint.slice(0, -1);
    }
    if (!endpoint.endsWith("/api/latest/graphql")) {
      endpoint = `${endpoint}/api/latest/graphql`;
    }

    config = {
      TURBOT_GRAPHQL_ENDPOINT: endpoint,
      TURBOT_ACCESS_KEY_ID: profileCredentials.accessKey!,
      TURBOT_SECRET_ACCESS_KEY: profileCredentials.secretKey!,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to read credentials from ${credentialsPath}: ${message}`
    );
  }
}

export default config;
