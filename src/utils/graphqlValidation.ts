import { parse, OperationDefinitionNode, GraphQLError, Source } from "graphql";

export function validateReadOnlyGraphQLQuery(query: string):
  | { valid: true; operation: OperationDefinitionNode }
  | { valid: false; error: string } {
  if (!query.trim()) {
    return { valid: false, error: "Query cannot be empty." };
  }

  if (query.toLowerCase().includes("mutation")) {
    return { valid: false, error: "Mutations are not allowed. Only read-only queries are supported." };
  }

  let document;
  try {
    document = parse(query);
  } catch (parseError) {
    if (parseError instanceof GraphQLError) {
      let errorMessage = parseError.message;
      const locations = parseError.locations;
      if (locations && locations.length > 0) {
        const location = locations[0];
        errorMessage += `\nLocation: line ${location.line}, column ${location.column}`;
      }
      const source = parseError.source;
      if (source instanceof Source) {
        const lines = source.body.split('\n');
        const errorLine = locations?.[0]?.line ?? 0;
        const contextStart = Math.max(0, errorLine - 2);
        const contextEnd = Math.min(lines.length, errorLine + 2);
        errorMessage += '\n\nQuery context:';
        for (let i = contextStart; i < contextEnd; i++) {
          const lineNum = i + 1;
          const prefix = lineNum === errorLine ? '> ' : '  ';
          errorMessage += `\n${prefix}${lineNum}: ${lines[i]}`;
        }
      }
      return { valid: false, error: errorMessage };
    }
    return { valid: false, error: (parseError as Error).message };
  }

  const operations = document.definitions.filter(
    (def): def is OperationDefinitionNode => def.kind === "OperationDefinition"
  );

  if (operations.length !== 1) {
    return {
      valid: false,
      error:
        "Your GraphQL query must contain exactly one operation (query). Please submit only one operation per request.",
    };
  }

  const operation = operations[0];
  if (operation.operation !== "query") {
    return {
      valid: false,
      error: `Invalid operation type: ${operation.operation}. Only queries are allowed in this tool.`,
    };
  }

  return { valid: true, operation };
} 