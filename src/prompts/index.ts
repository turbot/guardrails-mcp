import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetPromptResult, ListPromptsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../services/pinoLogger.js";
import { errorResponse } from "../utils/responseFormatter.mjs";

// Define the type for prompts
type Prompt = {
  name: string;
  description: string;
  handler: () => Promise<GetPromptResult>;
};

// Register all available prompts
const prompts: Prompt[] = [];

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
  // Register prompts list handler
  server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
    try {
      return {
        prompts: Object.values(promptCapabilities.prompts)
      };
    } catch (error) {
      logger.error('Error listing prompts:', error);
      return errorResponse(error instanceof Error ? error.message : String(error));
    }
  });

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