import { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

export const BEST_PRACTICES_PROMPT = {
  name: "best_practices",
  description: "Best practices for writing Turbot Guardrails GraphQL queries",
} as const;

export async function handleBestPracticesPrompt(): Promise<GetPromptResult> {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `When writing GraphQL queries for Turbot Guardrails, follow these essential best practices:

1. Response Style
   - Always return results in a clear, formatted structure
   - Minimize explanation of the query
   - Only explain specific aspects of the query if they are non-obvious or particularly important
   - Don't explain your understanding of the request or how you crafted the query
   - Keep responses concise and focused on the data
   - Explain your thinking when reworking queries for an error

2. Query Structure
   - Use fragments for reusable field selections
   - Nest queries appropriately to get related data
   - Use aliases when querying the same type multiple times
   - Example of a well-structured query:
     \`\`\`graphql
     fragment resourceFields on Resource {
       turbot {
         id
         title
       }
       type {
         uri
       }
       akas
     }

     query GetResources {
       resources(filter: "resourceType = aws_iam_user") {
         items {
           ...resourceFields
           trunk {
             items {
               ...resourceFields
             }
           }
         }
       }
     }
     \`\`\`

3. Query Syntax
   - Use consistent indentation (2 spaces)
   - Use PascalCase for operation names (queries and mutations)
   - Use camelCase for field names and arguments
   - Example:
     \`\`\`graphql
     query GetUserPolicies {
       resources(filter: "resourceType = aws_iam_user") {
         items {
           turbot {
             id
             title
           }
           data
         }
       }
     }
     \`\`\`

4. Field Selection
   - Only request fields you need
   - Use fragments to organize repeated field selections
   - Include turbot.id for resource identification
   - Include type.uri for resource type information
   - Bad:  { resources { items { data } } }
   - Good: { resources { items { turbot { id title } data } } }

5. Filtering
   - Use the filter argument to reduce data transfer
   - Filter as early as possible in the query
   - Common filters:
     - resourceType = <type>
     - resourceTypeId = <type_id>
     - controlCategoryId = <category_id>
     - policyTypeId = <policy_type_id>
   - Example:
     \`\`\`graphql
     query GetAwsUsers {
       resources(
         filter: "resourceType = aws_iam_user"
       ) {
         items {
           turbot {
             id
             title
           }
         }
       }
     }
     \`\`\`

6. Pagination
   - Use limit and paging arguments for large result sets
   - Default limit is usually sufficient for exploration
   - For complete data sets, use paging:
     \`\`\`graphql
     query GetPaginatedResources(
       $next: String
     ) {
       resources(
         filter: "resourceType = aws_iam_user"
         paging: { next: $next }
       ) {
         items {
           turbot {
             id
             title
           }
         }
         paging {
           next
         }
       }
     }
     \`\`\`

7. Variables
   - Use variables for dynamic values
   - Name variables descriptively
   - Provide default values when appropriate
   - Example:
     \`\`\`graphql
     query GetResourcesByType(
       $resourceType: String = "aws_iam_user"
     ) {
       resources(
         filter: "resourceType = \${resourceType}"
       ) {
         items {
           turbot {
             id
             title
           }
         }
       }
     }
     \`\`\`

8. Error Handling
   - Check for errors in the response
   - Handle pagination errors gracefully
   - Consider retry logic for transient failures
   - Log relevant error details for debugging

9. Performance Considerations
   - Request only needed fields
   - Use appropriate filters
   - Consider pagination for large result sets
   - Use fragments to optimize repeated field selections`
        }
      }
    ]
  };
} 