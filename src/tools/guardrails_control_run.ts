import { executeMutation } from "../utils/graphqlClient.js";
import { logger } from '../services/logger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { formatJson } from '../utils/jsonFormatter.mjs';
import { JSONSchemaType } from 'ajv';

interface RunControlResponse {
  runControl: {
    state: string;
    turbot: {
      id: string;
    };
    control: {
      type: {
        uri: string;
        trunk: {
          title: string;
        };
      };
      mute: string | null;
      primaryState: string;
      state: string;
      reason: string | null;
      details: string | null;
      turbot: {
        id: string;
      };
    };
    resource: {
      trunk: {
        title: string;
      };
      turbot: {
        id: string;
      };
      akas: string[];
    };
  };
}

type RunControlInput = {
  controlId: string;
};

interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchemaType<RunControlInput>;
  handler: (input: RunControlInput) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
  }>;
}

export const tool: Tool = {
  name: "guardrails_control_run",
  description: "Run a Turbot Guardrails control by its ID.",
  inputSchema: {
    type: "object",
    properties: {
      controlId: {
        type: "string",
        description: "The ID of the control to run"
      }
    },
    required: ["controlId"],
    additionalProperties: false
  } as JSONSchemaType<RunControlInput>,
  handler: async ({ controlId }: RunControlInput) => {
    logger.info("Starting run_guardrails_control tool execution");
    try {
      const mutation = `
        mutation RunControl($input: RunControlInput!) {
          runControl(input: $input) {
            state
            turbot {
              id
            }
            control {
              type {
                uri
                trunk {
                  title
                }
              }
              mute
              primaryState
              state
              reason
              details
              turbot {
                id
              }
            }
            resource {
              trunk {
                title
              }
              turbot {
                id
              }
              akas
            }
          }
        }
      `;

      const variables = {
        input: {
          id: controlId
        }
      };

      logger.debug("Executing GraphQL mutation with variables:", variables);
      const rawResult = await executeMutation(mutation, variables);
      logger.debug("Raw result:", rawResult);
      const result = JSON.parse(rawResult) as RunControlResponse;
      logger.debug("Parsed result:", result);

      if (!result.runControl) {
        throw new Error(`Invalid response structure: ${formatJson(result)}`);
      }

      const runControl = result.runControl;

      // Transform the response to flatten the structure
      const transformedResult = {
        process: {
          id: runControl.turbot.id,
          state: runControl.state
        },
        control: {
          id: runControl.control.turbot.id,
          type: {
            uri: runControl.control.type.uri,
            title: runControl.control.type.trunk.title
          },
          mute: runControl.control.mute,
          primaryState: runControl.control.primaryState,
          state: runControl.control.state,
          reason: runControl.control.reason,
          details: runControl.control.details
        },
        resource: {
          id: runControl.resource.turbot.id,
          title: runControl.resource.trunk.title,
          akas: runControl.resource.akas
        }
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in run_guardrails_control:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error running control: ${errorMessage}`);
    }
  }
}; 