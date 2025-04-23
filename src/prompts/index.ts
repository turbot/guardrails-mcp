import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { prompt as bestPracticesPrompt } from "./best_practices.js";
import { logger } from "../services/pinoLogger.js";

// Register all available prompts
const prompts = [bestPracticesPrompt];

// Export prompts for server capabilities
export const promptCapabilities = {
  prompts: Object.fromEntries(
    prompts.map(p => [p.name, {
      name: p.name,
      description: p.description
    }])
  )
};

export function registerPrompts(server: McpServer) {
  // Register each prompt
  prompts.forEach(prompt => {
    logger.debug(`Registering prompt: ${prompt.name}`);
    server.prompt(
      prompt.name,
      prompt.description,
      prompt.handler
    );
  });
} 