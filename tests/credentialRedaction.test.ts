import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const TEST_ACCESS_KEY = "AK_REDACTION_LIVE_KEY_098765";
const TEST_SECRET_KEY = "SK_REDACTION_LIVE_KEY_543210";

before(() => {
  process.env.TURBOT_GRAPHQL_ENDPOINT =
    "https://acme.cloud.turbot.com/api/latest/graphql";
  process.env.TURBOT_ACCESS_KEY_ID = TEST_ACCESS_KEY;
  process.env.TURBOT_SECRET_ACCESS_KEY = TEST_SECRET_KEY;
});

describe("redactCredentials (live module, bound to the running config)", () => {
  let redactCredentials: (s: string) => string;

  before(async () => {
    ({ redactCredentials } = await import(
      "../src/utils/credentialRedaction.js"
    ));
  });

  it("redacts the access key from a string", () => {
    const out = redactCredentials(`error mentioning ${TEST_ACCESS_KEY}`);
    assert.doesNotMatch(out, new RegExp(TEST_ACCESS_KEY));
    assert.match(out, /\[REDACTED\]/);
  });

  it("redacts the secret key from a string", () => {
    const out = redactCredentials(`leaked: ${TEST_SECRET_KEY}`);
    assert.doesNotMatch(out, new RegExp(TEST_SECRET_KEY));
    assert.match(out, /\[REDACTED\]/);
  });

  it("redacts the base64 auth header form", () => {
    const auth = Buffer.from(
      `${TEST_ACCESS_KEY}:${TEST_SECRET_KEY}`,
    ).toString("base64");
    const out = redactCredentials(`Authorization: Basic ${auth}`);
    assert.doesNotMatch(out, new RegExp(auth));
  });

  it("returns the input unchanged when no secrets are present", () => {
    assert.equal(
      redactCredentials("hello world"),
      "hello world",
    );
  });

  it("redacts every occurrence in a single pass", () => {
    const out = redactCredentials(
      `${TEST_ACCESS_KEY} and again ${TEST_ACCESS_KEY}`,
    );
    assert.equal(out, "[REDACTED] and again [REDACTED]");
  });
});
