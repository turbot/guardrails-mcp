# Turbot Guardrails Model Context Protocol (MCP) Server

Unlock the power of AI-driven cloud governance with [Turbot Guardrails](https://turbot.com/guardrails)! This Model Context Protocol (MCP) server connects AI assistants like Claude to your Guardrails data, enabling natural language exploration, analysis, and automation across your cloud estate.

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

Guardrails MCP supports two authentication methods. Environment variable names match the [Turbot CLI](https://turbot.com/guardrails/docs/reference/cli), so users with the CLI already configured don't need to redefine their credentials. Legacy v0.1.x names are accepted as aliases.

#### Preferred: Turbot CLI profile

If you use the Turbot CLI you already have a `credentials.yml` file with named profiles. Reference one by name:

```json
{
  "mcpServers": {
    "turbot-guardrails": {
      "command": "npx",
      "args": ["-y", "@turbot/guardrails-mcp"],
      "env": {
        "TURBOT_PROFILE": "your-profile-name"
      }
    }
  }
}
```

By default the MCP reads `~/.config/turbot/credentials.yml`. To use a different location set `TURBOT_CLI_CREDENTIALS_PATH` — `~` is expanded automatically, so `~/Documents/turbot.yml` works inside JSON configs that don't go through a shell.

Example `credentials.yml`:

```yaml
demo-acme:
  workspace: https://demo-acme.cloud.turbot.com
  accessKey: abcdefgh-1234-0808-wxyz-123456789012
  secretKey: hgfedcba-1234-0101-aaaa-aabbccddee00
```

#### Alternative: direct environment variables

Set all three credential variables directly in the MCP server configuration:

```json
{
  "mcpServers": {
    "turbot-guardrails": {
      "command": "npx",
      "args": ["-y", "@turbot/guardrails-mcp"],
      "env": {
        "TURBOT_WORKSPACE": "https://demo-acme.cloud.turbot.com",
        "TURBOT_ACCESS_KEY": "abcdefgh-1234-0808-wxyz-123456789012",
        "TURBOT_SECRET_KEY": "hgfedcba-1234-0101-aaaa-aabbccddee00"
      }
    }
  }
}
```

`TURBOT_WORKSPACE` accepts either the bare workspace URL or a fully-qualified GraphQL endpoint. The `/api/latest/graphql` suffix is added automatically if missing, and trailing slashes / whitespace are normalised.

If both methods are set, the **direct credentials win** (matches the Turbot CLI's precedence). The profile is used when at least one direct variable is missing.

#### Backward compatibility (v0.1.x env var names)

Existing v0.1.x configurations continue to work without change. The legacy names map to the CLI-aligned names as follows:

| CLI-aligned (preferred) | Legacy alias (still accepted) |
| --- | --- |
| `TURBOT_PROFILE` | `TURBOT_CLI_PROFILE` |
| `TURBOT_WORKSPACE` | `TURBOT_GRAPHQL_ENDPOINT` |
| `TURBOT_ACCESS_KEY` | `TURBOT_ACCESS_KEY_ID` |
| `TURBOT_SECRET_KEY` | `TURBOT_SECRET_ACCESS_KEY` |

When both names are set for the same field, the CLI-aligned name wins. New configurations should use the CLI-aligned names.

### AI Assistant Setup

| Assistant      | Config File Location         | Setup Guide                                                                   |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Claude Desktop | `claude_desktop_config.json` | [Claude Desktop MCP Guide →](https://modelcontextprotocol.io/quickstart/user) |
| Cursor         | `~/.cursor/mcp.json`         | [Cursor MCP Guide →](https://docs.cursor.com/context/model-context-protocol)  |

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
3. Create a `.env` file with your credentials. You can use either method:

   Preferred — Turbot CLI profile:
   ```sh
   echo "TURBOT_PROFILE=your-profile-name" > .env
   ```

   Alternative — direct credentials:
   ```sh
   cat > .env <<'EOF'
   TURBOT_WORKSPACE=https://demo-acme.cloud.turbot.com
   TURBOT_ACCESS_KEY=your-access-key
   TURBOT_SECRET_KEY=your-secret-key
   EOF
   ```
4. Build the project:
   ```sh
   npm run build
   ```
5. For development with auto-recompilation:
   ```sh
   npm run watch
   ```
6. To use your local development version with Claude Desktop, update your config to point at the built `dist/index.js`:
   ```json
   {
     "mcpServers": {
       "turbot-guardrails": {
         "command": "node",
         "args": ["/full/path/to/guardrails-mcp/dist/index.js"],
         "env": {
           "TURBOT_PROFILE": "your-profile-name"
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

The server logs which credential method resolved at startup, so you can confirm the right path was taken:

```
Authenticated via Turbot CLI profile 'demo-acme' (from /Users/you/.config/turbot/credentials.yml)
```
or
```
Authenticated via direct environment variables
```

A warning is logged if the resolved endpoint does not use HTTPS, since Basic auth credentials would travel in plaintext.

- **Missing credentials:** Set either `TURBOT_PROFILE` or all three direct credential variables (`TURBOT_WORKSPACE`, `TURBOT_ACCESS_KEY`, `TURBOT_SECRET_KEY`). Legacy v0.1.x names are also accepted (`TURBOT_CLI_PROFILE`, `TURBOT_GRAPHQL_ENDPOINT`, `TURBOT_ACCESS_KEY_ID`, `TURBOT_SECRET_ACCESS_KEY`).
- **Profile not found:** Verify the profile name matches an entry in your credentials file, and that the file path is correct (`~/.config/turbot/credentials.yml` by default).
- **Profile missing fields:** Each profile in `credentials.yml` must include `workspace`, `accessKey`, and `secretKey`.
- **Authentication errors:** Ensure your API key is correct and has the necessary permissions. Credential values are redacted from any error message returned to your AI assistant.
- **Connection issues:** Verify the Guardrails endpoint URL is correct.
- **API errors:** Check the server logs for detailed GraphQL error messages.
