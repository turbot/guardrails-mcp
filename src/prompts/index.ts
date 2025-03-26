import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetPromptRequest } from "@modelcontextprotocol/sdk/types.js";
import { BEST_PRACTICES_PROMPT, handleBestPracticesPrompt } from "./bestPractices.js";

export function registerPrompts(server: McpServer) {
  server.prompt(
    BEST_PRACTICES_PROMPT.name,
    BEST_PRACTICES_PROMPT.description,
    handleBestPracticesPrompt
  );
} 