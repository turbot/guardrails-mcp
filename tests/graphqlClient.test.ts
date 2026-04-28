import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

// Set required env vars before the env.ts side-effecting module is loaded
// transitively via graphqlClient.ts. These values double as the secrets we
// expect to see redacted in test cases below.
const TEST_ACCESS_KEY = "AK_TEST_LEAK_CANARY_98765";
const TEST_SECRET_KEY = "SK_TEST_LEAK_CANARY_43210";

before(() => {
  process.env.TURBOT_GRAPHQL_ENDPOINT =
    "https://acme.cloud.turbot.com/api/latest/graphql";
  process.env.TURBOT_ACCESS_KEY_ID = TEST_ACCESS_KEY;
  process.env.TURBOT_SECRET_ACCESS_KEY = TEST_SECRET_KEY;
});

describe("formatGraphQLError", () => {
  let formatGraphQLError: (
    error: unknown,
    secrets?: readonly string[],
  ) => string;

  before(async () => {
    ({ formatGraphQLError } = await import(
      "../src/utils/graphqlClient.js"
    ));
  });

  it("formats a standard GraphQL error response", () => {
    const error = {
      response: {
        errors: [
          {
            message: "Field 'foo' not found",
            locations: [{ line: 3, column: 7 }],
            path: ["query", "foo"],
            extensions: { code: "GRAPHQL_VALIDATION_FAILED" },
          },
        ],
      },
    };
    const out = formatGraphQLError(error, []);
    assert.match(out, /Field 'foo' not found/);
    assert.match(out, /\(line 3, column 7\)/);
    assert.match(out, /at path: query\.foo/);
    assert.match(out, /Error code: GRAPHQL_VALIDATION_FAILED/);
  });

  it("falls through to error.message when there are no GraphQL errors", () => {
    const error = new Error("network down");
    const out = formatGraphQLError(error, []);
    assert.equal(out, "network down");
  });

  it("redacts the access key when it appears in error.message (the real-world 401 leak)", () => {
    // This is the exact shape graphql-request produces on a 401 where the
    // upstream Guardrails server echoes the access key in its body.
    const error = {
      message: `GraphQL Error (Code: 401): {"response":{"code":401,"message":"Invalid access key: ${TEST_ACCESS_KEY}. Please enter a valid access key.","status":401,"headers":{}},"request":{"query":"query { x }","variables":{}}}`,
    };
    const out = formatGraphQLError(error);
    assert.doesNotMatch(
      out,
      new RegExp(TEST_ACCESS_KEY),
      "access key must not appear in formatted error",
    );
    assert.match(out, /\[REDACTED\]/);
    // Surrounding context should still be there
    assert.match(out, /Invalid access key/);
  });

  it("redacts the secret key when it appears in any error string", () => {
    const error = { message: `oops: ${TEST_SECRET_KEY}` };
    const out = formatGraphQLError(error);
    assert.doesNotMatch(out, new RegExp(TEST_SECRET_KEY));
    assert.match(out, /\[REDACTED\]/);
  });

  it("redacts the base64 auth header form if it ever appears", () => {
    const authHeader = Buffer.from(
      `${TEST_ACCESS_KEY}:${TEST_SECRET_KEY}`,
    ).toString("base64");
    const error = { message: `Authorization: Basic ${authHeader}` };
    const out = formatGraphQLError(error);
    assert.doesNotMatch(out, new RegExp(authHeader));
    assert.match(out, /\[REDACTED\]/);
  });

  it("redacts credentials inside an extracted GraphQL error message too", () => {
    // Even when the response.errors path is hit, redaction should still apply.
    const error = {
      response: {
        errors: [
          {
            message: `Authentication failed for ${TEST_ACCESS_KEY}`,
          },
        ],
      },
    };
    const out = formatGraphQLError(error);
    assert.doesNotMatch(out, new RegExp(TEST_ACCESS_KEY));
    assert.match(out, /Authentication failed/);
    assert.match(out, /\[REDACTED\]/);
  });

  it("handles errors that are bare strings", () => {
    const out = formatGraphQLError("unexpected", []);
    assert.equal(out, "unexpected");
  });

  it("returns 'undefined' fallback when no message and no string form available", () => {
    // error.message undefined, String(error) === "[object Object]"
    const out = formatGraphQLError({}, []);
    assert.equal(out, "[object Object]");
  });
});
