import dotenv from "dotenv";
import { resolveConfig } from "./credentialResolver.js";

// Load environment variables from .env file
dotenv.config();

const resolved = resolveConfig();

// Metadata about which credential method resolved at startup. Exposed so
// index.ts can report it in startup logs without re-deriving.
export const configSource = {
  authMethod: resolved.authMethod,
  profile: resolved.profile,
  credentialsPath: resolved.credentialsPath,
};

export default resolved.config;
