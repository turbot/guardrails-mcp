# Guardrails Model Context Protocol (MCP) Server

<img src="https://badge.mcpx.dev?type=server" title="MCP Server"/> 
<!-- <img src="https://badge.mcpx.dev?type=server&features=tools" title="MCP server with features/>&nbsp; -->

Enable AI assistants like Claude to explore, analyze, and interact with your Guardrails data! This Model Context Protocol (MCP) server provides powerful capabilities:

- Query and analyze cloud resources using GraphQL
- List and filter available resource types, control types, and policy types
- Execute controls to assess cloud resource compliance
- Explore GraphQL schemas for custom queries
- Process templates using Nunjucks for dynamic configurations

## Demo

### Query Guardrails and Run a control
https://github.com/user-attachments/assets/d3712d18-571a-45f7-9241-19c598d072ce

### Create a policy pack
https://github.com/user-attachments/assets/51494295-6f80-4a2f-a785-15f77c102199

**Note**: The following context was added to the Project.

**Project Instructions**

- Role: You are a Turbot Guardrails Admin with deep expertise in managing, configuring, and automating Guardrails policies, controls, and resources.

- Expertise in Guardrails Hub: You have extensive knowledge of all features, configurations, and integrations available at Turbot Guardrails Hub - https://hub.guardrails.turbot.com/

- Advanced Skills in GraphQL & Nunjucks: You are an expert in GraphQL for querying and mutating data, as well as Nunjucks templating for dynamic policy configurations and automation within Turbot Guardrails.

**Project knowledge & Reference Materials**

The following resources were made available for reference:

- https://github.com/turbot/guardrails-docs/blob/main/docs/getting-started/7-minute-labs/graphql/index.md
- https://github.com/turbot/guardrails-docs/tree/main/docs/reference/filter
- https://github.com/turbot/guardrails-samples/tree/main/queries
- https://github.com/turbot/guardrails-samples/tree/main/policy_packs/aws/ec2 (For EBS volume policy pack demo)

## Tools

### query_guardrails

Execute any GraphQL query with optional variables

- Input:
  - query (string): The graphql query to execute
  - variable (string)(Optional): Variable to pass to the query.

### list_resource_types

List all available resource types in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.

- Input:
  - filter (string)(Optional): Filter to apply (e.g. 'category:storage' or 'title:/bucket/i')

### list_control_types

List all available control types in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.

- Input:
  - filter (string)(Optional): Filter to apply (e.g. 'category:security' or 'title:/encryption/i')

### list_policy_types

List all available policy types in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.

- Input:
  - filter (string)(Optional): Filter to apply (e.g. 'category:security' or 'title:/encryption/i')

### run_control

Run a Turbot Guardrails control by its ID.

- Input:
  - controlId (string): The ID of the control to run

## Prerequisites

- Node.js 20 or higher
- A [Turbot Guardrails API](https://turbot.com/guardrails/docs/guides/using-guardrails/iam/access-keys#generate-a-new-guardrails-api-access-key) key with at least:

  - `Turbot/ReadOnly` permissions in order to use the "query_guardrails" tool and list tools.
  - `Turbot/Operator` permissions in order to execute controls using the "run_control" tool.

- The endpoint URL for your Guardrails workspace

## Installation

### Claude Desktop

[How to use MCP servers with Claude Desktop →](https://modelcontextprotocol.io/quickstart/user)

Add the following configuration to the "mcpServers" section of your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "turbot-guardrails": {
      "command": "npx",
      "args": ["-y", "github:turbot/guardrails-mcp"],
      "env": {
        "TURBOT_GRAPHQL_ENDPOINT": "https://turbot.cloud.acme.com/api/latest/graphql",
        "TURBOT_ACCESS_KEY_ID": "abcdefgh-1234-0808-wxyz-123456789012",
        "TURBOT_SECRET_ACCESS_KEY": "hgfedcba-1234-0101-aaaa-aabbccddee00"
      }
    }
  }
}
```

## Local Development

1. Clone the repository and navigate to the directory:

   ```sh
   git clone https://github.com/turbot/guardrails-mcp.git
   cd guardrails-mcp
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file with your Turbot Guardrails API credentials:

   ```
   cp .env.example .env
   # Edit .env with your API key
   ```

4. Build the project:

   ```
   npm run build
   ```

5. For development with auto-recompilation:

```sh
npm run watch
```

6. To use your local development version with Claude Desktop, update your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "turbot-guardrails": {
         "command": "node",
         "args": ["/full/path/to/guardrails-mcp/dist/index.js"],
         "env": {
           "TURBOT_GRAPHQL_ENDPOINT": "https://turbot.cloud.acme.com/api/latest/graphql",
           "TURBOT_ACCESS_KEY_ID": "abcdefgh-1234-0808-wxyz-123456789012",
           "TURBOT_SECRET_ACCESS_KEY": "hgfedcba-1234-0101-aaaa-aabbccddee00"
         }
       }
     }
   }
   ```

Replace `/path/to/your/workspace` with the absolute path to your local development directory. For example, if you cloned the repository to `~/src/guardrails-mcp`, you would use `~/src/guardrails-mcp/dist/index.js`.

## Debugging

- MCP Inspector

  You can test the server with the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector):

  First build the server,

  ```
  npm run build
  ```

  Use the following command to run the inspector

  ```
  npx @modelcontextprotocol/inspector node dist/index.js
  ```

* Logs

  View the logs

  ```
  tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
  ```

## Troubleshooting

- **Authentication Errors**: Ensure your API key is correct and has the necessary permissions
- **Connection Issues**: Verify the Guardrails endpoint URL is correct
- **API Errors**: Check the server logs for detailed GraphQL error messages
