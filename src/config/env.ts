import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "TURBOT_GRAPHQL_ENDPOINT",
  "TURBOT_ACCESS_KEY_ID",
  "TURBOT_SECRET_ACCESS_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`❌ Missing required environment variable: ${envVar}`);
  }
}

// Export validated environment variables
const config = {
  TURBOT_GRAPHQL_ENDPOINT: process.env.TURBOT_GRAPHQL_ENDPOINT!,
  TURBOT_ACCESS_KEY_ID: process.env.TURBOT_ACCESS_KEY_ID!,
  TURBOT_SECRET_ACCESS_KEY: process.env.TURBOT_SECRET_ACCESS_KEY!,
};

export default config;