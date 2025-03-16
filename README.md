# Guardrails Model Context Protocol (MCP) Server

<img src="https://badge.mcpx.dev?type=server" title="MCP Server"/>
<img src="https://badge.mcpx.dev?type=server&features=tools" title="MCP server with features/>&nbsp;

&nbsp;

Enable AI assistants like Claude to explore and query your Guardrails data! This Model Context Protocol (MCP) server lets AI tools:

- Execute a GraphQL query to retrieve data.
- Execute a GraphQL mutation to create, update, or delete managing resources, policy settings, and executing controls/policies.

## Demo

Note: I have added the following context for my Project.

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

> [!WARNING]
> Carefully review each mutation before allowing Claude to execute it.

## Tools

### guardrails_query

Execute any GraphQL query with optional variables

- Input:
  - query (string): The graphql query to execute
  - variable (string)(Optional): Variable to pass to the query.

### guardrails_mutation

Execute any GraphQL mutation with optional variables

- Input:
  - query (string): The graphql mutation query to execute
  - variable (string)(Optional): Variable to pass to the mutation.

## Prerequisites

- Node.js 20 or higher
- A [Turbot Guardrails API](https://turbot.com/guardrails/docs/guides/using-guardrails/iam/access-keys#generate-a-new-guardrails-api-access-key) key with alteast,

  - `Turbot/ReadOnly` permissions in order to use the "guardrails_query" tool.
  - `Turbot/Operator` permissions in order to just execute the controls/policies using the "guardrails_mutation" tool.
  - `Turbot/Admin` permissions in order to create/update/delete resources, policy settings using the "guardrails_mutation" tool.

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

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
