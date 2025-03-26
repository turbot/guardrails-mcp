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
   - Keep responses concise and focused on the data

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
       resources(filter: "resourceType:tmod:@turbot/aws-s3#/resource/types/bucket") {
         items {
           ...resourceFields
           trunk {
             items {
               turbot {
                 id
                 title
               }
             }
           }
         }
         paging {
           next
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
       resources(filter: "resourceType:tmod:@turbot/aws-iam#/resource/types/iamUser") {
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
   - Multiple conditions are joined with whitespace (AND)
   - Multiple values can be joined with commas (OR)
   - Common filters:
     
     a. Resource Search:
     - Full text search in AKAs: resource:foo level:self
     - AWS account specific: resource:arn:aws:::876515858155 level:self
     - Resources within account: resource:arn:aws:::876515858155 level:descendant
     
     b. Tags and Metadata:
     - Tag filters: tags:department=/^sales$/i
     - Creation time: createTimestamp:>T-7d
     - Last modified: timestamp:>T-15m
     - Actor filter: actorIdentityId:170668258072293
     
     c. Resource Properties:
     - IP range filter: resourceType:instance $.PrivateIpAddress:<172.31.6.0/24
     - Numeric comparison: resourceType:volume $.Size:>=1000
     - State filter: resourceType:volume $.Attachments.*.State:!attached
     
     d. Categories and Types:
     - Resource categories: resourceCategory:compute,storage
     - Control types: controlType:dataProtection
     - Policy types: policyType:approvedPublicIp
     
     Example:
     \`\`\`graphql
     query GetAwsResources {
       resources(
         filter: "resourceType:tmod:@turbot/aws-ec2#/resource/types/instance timestamp:>T-24h tags:environment=prod"
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
   - Use the paging argument with the next token from previous results
   - The paging token is returned in the paging.next field
   - Example:
     \`\`\`graphql
     query GetPaginatedResources($nextToken: String) {
       resources(
         filter: "resourceType:tmod:@turbot/aws-ec2#/resource/types/instance sort:title"
         paging: $nextToken
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

7. Sorting
   - Use sort: in filters
   - Sort ascending: sort:title
   - Sort descending: sort:-title
   - Multiple sorts: sort:title,createTimestamp
   - Example: filter: "resourceType:tmod:@turbot/aws-ec2#/resource/types/instance sort:title,-createTimestamp"

8. Error Handling
   - Check for errors in the response
   - Handle pagination errors gracefully
   - Consider retry logic for transient failures
   - Log relevant error details for debugging

9. Performance Considerations
   - Request only needed fields
   - Use appropriate filters to reduce data transfer
   - Use pagination for large result sets
   - Use fragments to optimize repeated field selections
   - Default limit is 20, can be changed with limit: in filter
   - Example: filter: "resourceType:tmod:@turbot/aws-ec2#/resource/types/instance limit:100"`
        }
      }
    ]
  };
}