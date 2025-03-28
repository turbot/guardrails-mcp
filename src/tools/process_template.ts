import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import nunjucks from "nunjucks";
import { parse as parseYaml } from "yaml";

// Configure nunjucks
nunjucks.configure({ autoescape: false, trimBlocks: true, lstripBlocks: true });

type ProcessTemplateInput = {
  template: string;
  input: Record<string, any>;
};

export function registerProcessTemplateTool(server: McpServer) {
  server.tool(
    "process_template",
    "Process input data through a Nunjucks template. The input data is made available as $ in the template. The template must return valid YAML.",
    {
      template: z.string().describe("The Nunjucks template to process"),
      input: z.record(z.any()).describe("The input data to make available as $ in the template"),
    },
    async ({ template, input }: ProcessTemplateInput) => {
      try {
        // Process the template with input data
        const result = nunjucks.renderString(template, { $: input });

        // Validate that the output is valid YAML
        try {
          parseYaml(result);
        } catch (error) {
          const yamlError = error as Error;
          throw new Error(`Template output is not valid YAML: ${yamlError.message}`);
        }

        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        const processError = error as Error;
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to process template: ${processError.message}` }]
        };
      }
    }
  );
} 