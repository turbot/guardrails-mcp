import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse, formatGraphQLError } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface ControlDetail {
  key: string;
  value: string;
}

interface ControlMute {
  note: string | null;
  untilStates: string[];
  toTimestamp: string | null;
}

interface ControlProcess {
  state: string;
  turbot: {
    id: string;
    createTimestamp: string;
  };
}

interface Control {
  state: string;
  reason: string | null;
  details: ControlDetail[] | null;
  mute: ControlMute | null;
  trunk: {
    title: string;
  } | null;
  turbot: {
    id: string;
    timestamp: string;
    stateChangeTimestamp: string;
    nextTickTimestamp: string | null;
  };
  type: {
    uri: string;
    trunk: {
      title: string;
    };
  };
  resource: {
    data: Record<string, any>;
    metadata: Record<string, any>;
    trunk: {
      title: string;
    } | null;
    turbot: {
      id: string;
      akas: string[];
      tags: Record<string, string>;
    };
    type: {
      uri: string;
    };
  };
  lastProcess: ControlProcess | null;
  process: ControlProcess | null;
}

interface QueryResponse {
  control: Control;
}

type ShowControlInput = {
  id: string;
};

export const tool: Tool = {
  name: "guardrails_control_show",
  description: "Show detailed information about a specific control.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID of the control to show (e.g. '320152411455166')"
      }
    },
    required: ["id"],
    additionalProperties: false
  },
  handler: async ({ id }: ShowControlInput) => {
    logger.info("Starting show_guardrails_control tool execution");
    try {
      const query = `
        query ShowControl($id: ID!) {
          control(id: $id) {
            state
            reason
            details
            mute {
              note
              untilStates
              toTimestamp
            }
            turbot {
              id
              timestamp
              stateChangeTimestamp
              nextTickTimestamp
            }
            type {
              uri
              trunk {
                title
              }
            }
            resource {
              data
              metadata
              trunk {
                title
              }
              turbot {
                id
                akas
                tags
              }
              type {
                uri
              }
            }
            lastProcess {
              state
              turbot {
                id
                createTimestamp
              }
            }
            process {
              state
              turbot {
                id
                createTimestamp
              }
            }
          }
        }
      `;

      logger.debug("Executing GraphQL query with ID:", id);
      const result = JSON.parse(await executeQuery(query, { id })) as QueryResponse;
      logger.info("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const control = result.control;
      const transformedResult = {
        id: control.turbot.id,
        state: control.state,
        reason: control.reason,
        details: control.details,
        mute: control.mute,
        type: {
          uri: control.type.uri,
          title: control.type.trunk.title
        },
        turbot: {
          timestamp: control.turbot.timestamp,
          stateChangeTimestamp: control.turbot.stateChangeTimestamp,
          nextTickTimestamp: control.turbot.nextTickTimestamp
        },
        resource: {
          id: control.resource.turbot.id,
          title: control.resource.trunk?.title || null,
          typeUri: control.resource.type.uri,
          akas: control.resource.turbot.akas,
          tags: control.resource.turbot.tags,
          data: control.resource.data,
          metadata: control.resource.metadata
        },
        lastProcess: control.lastProcess ? {
          state: control.lastProcess.state,
          id: control.lastProcess.turbot.id,
          createTimestamp: control.lastProcess.turbot.createTimestamp
        } : null,
        process: control.process ? {
          state: control.process.state,
          id: control.process.turbot.id,
          createTimestamp: control.process.turbot.createTimestamp
        } : null
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in show_guardrails_control:", error);
      return errorResponse(formatGraphQLError(error, id));
    }
  }
}; 