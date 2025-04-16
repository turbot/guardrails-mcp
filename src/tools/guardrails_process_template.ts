import nunjucks from "nunjucks";
import { parse as parseYaml } from "yaml";
import { filters } from "../utils/nunjucksFilters.js";
import { logger } from '../services/logger.js';
import { formatToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// Configure nunjucks with custom filters
const env = nunjucks.configure({ autoescape: false, trimBlocks: true, lstripBlocks: true });

// Add all custom filters
Object.entries(filters).forEach(([name, filter]) => {
  env.addFilter(name, filter);
});

type ProcessTemplateInput = {
  template: string;
  input: Record<string, any>;
};

export const tool: Tool = {
  name: "guardrails_process_template",
  description: "Process input data through a Nunjucks template. The input data is made available as $ in the template. The template must return valid YAML.",
  inputSchema: {
    type: "object",
    properties: {
      template: {
        type: "string",
        description: "The Nunjucks template to process"
      },
      input: {
        type: "object",
        description: "The input data to make available as $ in the template"
      }
    },
    required: ["template", "input"],
    additionalProperties: false
  },
  handler: async ({ template, input }: ProcessTemplateInput) => {
    try {
      // Process the template with input data
      const result = env.renderString(template, { $: input });

      // Validate that the output is valid YAML
      try {
        parseYaml(result);
      } catch (error) {
        const yamlError = error as Error;
        throw new Error(`Template output is not valid YAML: ${yamlError.message}`);
      }

      logger.debug("Template processed successfully:", result);
      return formatToolResponse(result);
    } catch (error) {
      logger.error("Error processing template:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return errorResponse(errorMessage);
    }
  }
}; 