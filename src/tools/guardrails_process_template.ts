import { z } from "zod";
import nunjucks from "nunjucks";
import { parse as parseYaml } from "yaml";
import { filters } from "../utils/nunjucksFilters.js";
import { logger } from '../services/logger.js';
import { formatToolResponse, errorResponse } from '../utils/responseFormatter.mjs';

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

export const tool = {
  name: "guardrails_process_template",
  description: "Process input data through a Nunjucks template. The input data is made available as $ in the template. The template must return valid YAML.",
  schema: {
    template: z.string().describe("The Nunjucks template to process"),
    input: z.record(z.any()).describe("The input data to make available as $ in the template"),
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