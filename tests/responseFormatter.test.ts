import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const TEST_ACCESS_KEY = "AK_RF_LEAK_CANARY_98765";
const TEST_SECRET_KEY = "SK_RF_LEAK_CANARY_43210";

before(() => {
  process.env.TURBOT_GRAPHQL_ENDPOINT =
    "https://acme.cloud.turbot.com/api/latest/graphql";
  process.env.TURBOT_ACCESS_KEY_ID = TEST_ACCESS_KEY;
  process.env.TURBOT_SECRET_ACCESS_KEY = TEST_SECRET_KEY;
});

const noopLogger = {
  error: (..._args: unknown[]) => {},
};

describe("formatGraphQLResultWithErrors (200-with-errors leak path)", () => {
  let formatGraphQLResultWithErrors: (result: any, logger: any) => any;

  before(async () => {
    ({ formatGraphQLResultWithErrors } = await import(
      "../src/utils/responseFormatter.mjs"
    ));
  });

  it("redacts the access key from error messages before returning to the client", () => {
    const result = {
      data: null,
      errors: [
        {
          message: `Permission denied for access key ${TEST_ACCESS_KEY}`,
          path: ["resourceTypes"],
          locations: [{ line: 1, column: 1 }],
        },
      ],
    };

    const response = formatGraphQLResultWithErrors(result, noopLogger);
    const payload = response.content[0].text;
    assert.equal(response.isError, true);
    assert.doesNotMatch(payload, new RegExp(TEST_ACCESS_KEY));
    assert.match(payload, /\[REDACTED\]/);
    assert.match(payload, /Permission denied/);
  });

  it("redacts the secret key when echoed in any error message", () => {
    const result = {
      data: null,
      errors: [{ message: `secret was ${TEST_SECRET_KEY}` }],
    };
    const response = formatGraphQLResultWithErrors(result, noopLogger);
    const payload = response.content[0].text;
    assert.doesNotMatch(payload, new RegExp(TEST_SECRET_KEY));
    assert.match(payload, /\[REDACTED\]/);
  });

  it("does not redact data fields — only error messages", () => {
    const valueThatHappensToMatch = TEST_ACCESS_KEY;
    const result = {
      data: { someField: valueThatHappensToMatch },
      errors: [{ message: "no creds in this message" }],
    };
    const response = formatGraphQLResultWithErrors(result, noopLogger);
    const payload = response.content[0].text;
    // The data field IS preserved verbatim — we only mask error messages.
    assert.match(payload, new RegExp(valueThatHappensToMatch));
  });

  it("returns success-shaped (no isError) when there are no errors", () => {
    const result = { data: { someField: "ok" } };
    const response = formatGraphQLResultWithErrors(result, noopLogger);
    assert.notEqual(response.isError, true);
    assert.match(response.content[0].text, /someField/);
  });

  it("preserves error path and locations alongside the redacted message", () => {
    const result = {
      data: null,
      errors: [
        {
          message: `bad ${TEST_ACCESS_KEY}`,
          path: ["a", "b"],
          locations: [{ line: 5, column: 7 }],
        },
      ],
    };
    const response = formatGraphQLResultWithErrors(result, noopLogger);
    const payload = response.content[0].text;
    assert.match(payload, /"path"/);
    assert.match(payload, /"locations"/);
    assert.doesNotMatch(payload, new RegExp(TEST_ACCESS_KEY));
  });
});
