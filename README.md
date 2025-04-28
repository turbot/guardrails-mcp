# Guardrails Model Context Protocol (MCP) Server

Unlock the power of AI-driven cloud governance with Turbot Guardrails! This Model Context Protocol (MCP) server connects AI assistants like Claude to your Guardrails data, enabling natural language exploration, analysis, and automation across your cloud estate.

Guardrails MCP bridges AI assistants and your Guardrails environment, allowing natural language:
- Querying and analyzing cloud resources using GraphQL
- Listing and filtering resource, control, and policy types
- Executing controls and reviewing compliance
- Exploring GraphQL schemas for custom queries
- Processing templates using Nunjucks for dynamic configurations

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- A [Turbot Guardrails API](https://turbot.com/guardrails/docs/guides/using-guardrails/iam/access-keys#generate-a-new-guardrails-api-access-key) key with appropriate permissions
- The endpoint URL for your Guardrails workspace

### Configuration

Add Guardrails MCP to your AI assistant's configuration file:

```json
{
  "mcpServers": {
    "turbot-guardrails": {
      "command": "npx",
      "args": ["-y", "github:turbot/guardrails-mcp"],
      "env": {
        "TURBOT_GRAPHQL_ENDPOINT": "https://demo-acme.cloud.turbot.com/api/latest/graphql",
        "TURBOT_ACCESS_KEY_ID": "abcdefgh-1234-0808-wxyz-123456789012",
        "TURBOT_SECRET_ACCESS_KEY": "hgfedcba-1234-0101-aaaa-aabbccddee00"
      }
    }
  }
}
```

### AI Assistant Setup

| Assistant        | Config File Location           | Setup Guide |
|-----------------|-------------------------------|-------------|
| Claude Desktop  | `claude_desktop_config.json`   | [Claude Desktop MCP Guide →](https://modelcontextprotocol.io/quickstart/user) |
| Cursor          | `~/.cursor/mcp.json`           | [Cursor MCP Guide →](https://docs.cursor.com/context/model-context-protocol) |

Save the configuration file and restart your AI assistant for the changes to take effect.

## Prompting Guide

Start by asking about your Guardrails environment, for example:
```
What AWS accounts can you see in Guardrails?
```

Simple, specific questions work well:
```
Show me all S3 buckets created in the last week
```

Generate compliance and security reports:
```
List all EC2 instances that are non-compliant with our tagging standards
```

Explore policy and control types:
```
Show me all policy types related to encryption
List all control types for S3 buckets
```

Dive into resource details:
```
Show details for resource ID 1234567890
```

Remember to:
- Be specific about which resources, controls, or policies you want to analyze
- Use filters for categories, titles, or tags
- Start with simple queries before adding complex conditions
- Use natural language – the LLM will handle the GraphQL translation

## Capabilities

### Tools

#### Core Query & Template Tools
- **guardrails_query**
  - Run any read-only GraphQL query in Guardrails.
  - Input: `query` (string, required), `variables` (object, optional)
- **guardrails_query_runnable**
  - Run a GraphQL query against a specific runnable type and resource.
  - Input: `runnableTypeUri` (string), `resourceId` (string), `query` (string), `variables` (object, optional)
- **guardrails_query_runnable_introspection**
  - Introspect the schema of a runnable type.
  - Input: `runnableTypeUri` (string), `section` (string, optional: 'queryType', 'types', 'type'), `typeName` (string, required if section is 'type')
- **guardrails_process_template**
  - Render a Nunjucks template with provided input.
  - Input: `template` (string), `input` (object, optional)

#### Resource Operations
- **guardrails_resource_list**
  - List resources, with optional filter.
  - Input: `filter` (string, optional)
- **guardrails_resource_show**
  - Show details for a specific resource.
  - Input: `id` (string)
- **guardrails_resource_type_list**
  - List resource types, with optional filter.
  - Input: `filter` (string, optional)
- **guardrails_resource_type_show**
  - Show details for a specific resource type.
  - Input: `id` (string)

#### Control Operations
- **guardrails_control_list**
  - List controls, with optional filter.
  - Input: `filter` (string, optional)
- **guardrails_control_show**
  - Show details for a specific control.
  - Input: `id` (string)
- **guardrails_control_run**
  - Run a control by its ID.
  - Input: `controlId` (string)
- **guardrails_control_type_list**
  - List control types, with optional filter.
  - Input: `filter` (string, optional)
- **guardrails_control_type_show**
  - Show details for a specific control type.
  - Input: `id` (string)

#### Policy Operations
- **guardrails_policy_type_list**
  - List policy types, with optional filter.
  - Input: `filter` (string, optional)
- **guardrails_policy_type_show**
  - Show details for a specific policy type.
  - Input: `id` (string)
- **guardrails_policy_setting_list**
  - List policy settings, with optional filter.
  - Input: `filter` (string, optional)
- **guardrails_policy_setting_show**
  - Show details for a specific policy setting.
  - Input: `id` (string)

## Development

### Clone and Setup

1. Clone the repository and navigate to the directory:
   ```sh
   git clone https://github.com/turbot/guardrails-mcp.git
   cd guardrails-mcp
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file with your Turbot Guardrails API credentials:
   ```sh
   cp .env.example .env
   # Edit .env with your API key
   ```
4. Build the project:
   ```sh
   npm run build
   ```
5. For development with auto-recompilation:
   ```sh
   npm run watch
   ```
6. To use your local development version with Claude Desktop, update your config:
   ```json
   {
     "mcpServers": {
       "turbot-guardrails": {
         "command": "node",
         "args": ["/full/path/to/guardrails-mcp/dist/index.js"],
         "env": {
           "TURBOT_GRAPHQL_ENDPOINT": "https://demo-acme.cloud.turbot.com/api/latest/graphql",
           "TURBOT_ACCESS_KEY_ID": "abcdefgh-1234-0808-wxyz-123456789012",
           "TURBOT_SECRET_ACCESS_KEY": "hgfedcba-1234-0101-aaaa-aabbccddee00"
         }
       }
     }
   }
   ```

Replace `/full/path/to/guardrails-mcp` with the absolute path to your local development directory.

## Debugging

- **MCP Inspector**
  - Test the server with the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector):
    ```sh
    npm run build
    npx @modelcontextprotocol/inspector node dist/index.js
    ```

## Troubleshooting

- **Authentication Errors**: Ensure your API key is correct and has the necessary permissions
- **Connection Issues**: Verify the Guardrails endpoint URL is correct
- **API Errors**: Check the server logs for detailed GraphQL error messages
