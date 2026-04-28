## v0.2.0 [2026-04-28]

_What's new_

* Authenticate with Turbot CLI profile credentials. Set `TURBOT_PROFILE` (and optionally `TURBOT_CLI_CREDENTIALS_PATH`) to resolve credentials from `~/.config/turbot/credentials.yml` instead of pasting them directly into your AI assistant config.
* Environment variable names now match the Turbot CLI: `TURBOT_PROFILE`, `TURBOT_WORKSPACE`, `TURBOT_ACCESS_KEY`, `TURBOT_SECRET_KEY`. Users with the CLI configured can run the MCP without redefining credentials. The legacy v0.1.x names (`TURBOT_CLI_PROFILE`, `TURBOT_GRAPHQL_ENDPOINT`, `TURBOT_ACCESS_KEY_ID`, `TURBOT_SECRET_ACCESS_KEY`) continue to work as aliases — when both names are set for the same logical field, the CLI-aligned name wins.
* When both a profile and the direct triple are set, the **direct credentials win** — matches the Turbot CLI's precedence rule. The profile is used when at least one direct variable is missing.
* The workspace URL is accepted with or without the `/api/latest/graphql` suffix in both authentication paths. Trailing slashes and surrounding whitespace are normalised.
* `~` is expanded in `TURBOT_CLI_CREDENTIALS_PATH` so AI-assistant JSON configs can reference paths like `~/Documents/turbot.yml` without shell expansion.
* The credentials file supports YAML 1.1 merge keys (`<<: *anchor`) and tolerates a leading UTF-8 BOM.
* Startup logs now report which credential method resolved (`Authenticated via Turbot CLI profile '...'` or `Authenticated via direct environment variables`) for easier debugging of "wrong workspace" misconfigurations.
* A warning is logged at startup if the resolved endpoint does not use HTTPS (Basic auth credentials would otherwise transmit in plaintext).

_Security_

* Credential values (access key, secret key, and base64 auth header form) are redacted from any error message returned to the MCP client. This guards against upstream services or libraries echoing credentials in error payloads.
* Updated `lodash`, `js-yaml`, `ajv`, `yaml`, and the transitive `path-to-regexp` and `qs` dependencies to fix known prototype-pollution and ReDoS advisories.

_Bug fixes_

* The MCP server no longer requires `HOME` to be set when only direct env credentials are used.


## v0.1.2 [2025-05-06]

_What's new_

* Fixed installation instructions in README


## v0.1.1 [2025-05-06]

_What's new_

* Improved README


## v0.1.0 [2025-05-06]

_What's new_

* Initial version of Turbot Guardrails MCP server
* Query resources, controls and types
* Mock and test policy settings and policy packs
