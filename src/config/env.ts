import dotenv from "dotenv";
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const directEnvVars = [
  "TURBOT_GRAPHQL_ENDPOINT",
  "TURBOT_ACCESS_KEY_ID",
  "TURBOT_SECRET_ACCESS_KEY",
];
const CLI_CREDENTIALS_DEFAULT_PATH = process.env.HOME ? `${process.env.HOME}/.config/turbot/credentials.yml` : null;
const cliCredentialVars = [
  // TURBOT_CLI_CREDENTIALS_PATH is optional, will use default if not set
  "TURBOT_CLI_PROFILE",
];

const hasDirectEnvVars = directEnvVars.every((envVar) => !!process.env[envVar]);

// Determine if CLI credentials are valid
let hasCliCredentialVars = false;
if (process.env["TURBOT_CLI_PROFILE"]) {
  if (CLI_CREDENTIALS_DEFAULT_PATH) {
    hasCliCredentialVars = true;
  } else if (process.env["TURBOT_CLI_CREDENTIALS_PATH"]) {
    hasCliCredentialVars = true;
  } else {
    throw new Error(
      `TURBOT_CLI_CREDENTIALS_PATH is required because the default credentials path could not be determined (HOME is not set).`
    );
  }
}

if (!hasDirectEnvVars && !hasCliCredentialVars) {
  // Determine which set is missing and throw a specific error
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

// Define the Config interface
interface Config {
  TURBOT_GRAPHQL_ENDPOINT: string;
  TURBOT_ACCESS_KEY_ID: string;
  TURBOT_SECRET_ACCESS_KEY: string;
}

// Export validated environment variables
let config = {
  TURBOT_GRAPHQL_ENDPOINT: process.env.TURBOT_GRAPHQL_ENDPOINT,
  TURBOT_ACCESS_KEY_ID: process.env.TURBOT_ACCESS_KEY_ID,
  TURBOT_SECRET_ACCESS_KEY: process.env.TURBOT_SECRET_ACCESS_KEY,
} as Config;

// If using CLI credentials, read and parse the YAML file and extract credentials for the profile
if (hasCliCredentialVars) {
  const credentialsPath = process.env["TURBOT_CLI_CREDENTIALS_PATH"] || CLI_CREDENTIALS_DEFAULT_PATH;
  const profile = process.env["TURBOT_CLI_PROFILE"];
  if (!credentialsPath) {
    throw new Error("Credentials path is not set and could not determine a default path.");
  }
  if (!profile) {
    throw new Error("TURBOT_CLI_PROFILE is required when using CLI credentials.");
  }
  try {
    const fileContent = readFileSync(credentialsPath, "utf8");
    const yamlData = parseYaml(fileContent);
    if (!Object.prototype.hasOwnProperty.call(yamlData, profile)) {
      throw new Error(`Profile '${profile}' not found in credentials file: ${credentialsPath}`);
    }
    const profileCredentials = yamlData[profile];
    // Ensure the endpoint is correctly formed
    let endpoint = profileCredentials.workspace;
    if (endpoint.endsWith('/')) {
      endpoint = endpoint.slice(0, -1);
    }
    // Only append /api/latest/graphql if it's not already present
    if (!endpoint.endsWith('/api/latest/graphql')) {
      endpoint = `${endpoint}/api/latest/graphql`;
    }
    config = {
      TURBOT_GRAPHQL_ENDPOINT: endpoint,
      TURBOT_ACCESS_KEY_ID: profileCredentials.accessKey,
      TURBOT_SECRET_ACCESS_KEY: profileCredentials.secretKey,
    } as Config;
  } catch (err: any) {
    throw new Error(`Failed to read credentials from ${credentialsPath}: ${err.message}`);
  }
}

export default config;