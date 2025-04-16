import { z } from "zod";
import { executeMutation } from "../utils/graphqlClient.js";
import { logger } from '../services/logger.js';

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

export const tool = {
  name: "guardrails_control_run",
  description: "Run a Turbot Guardrails control by its ID.",
  schema: {
    controlId: z.string().describe("The ID of the control to run")
  },
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
        throw new Error(`Invalid response structure: ${JSON.stringify(result)}`);
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

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(transformedResult, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error("Error in run_guardrails_control:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Error running control: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
}; 