import dotenv from "dotenv";
import { resolveConfig } from "./credentialResolver.js";

// Load environment variables from .env file
dotenv.config();

const config = resolveConfig();

export default config;
