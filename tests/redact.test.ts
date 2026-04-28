import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactStrings } from "../src/utils/redact.js";

describe("redactStrings", () => {
  it("returns empty input unchanged", () => {
    assert.equal(redactStrings("", ["secret"]), "");
  });

  it("returns input unchanged when secrets list is empty", () => {
    assert.equal(redactStrings("hello world", []), "hello world");
  });

  it("redacts a single occurrence of a secret", () => {
    assert.equal(
      redactStrings("token is abc123 here", ["abc123"]),
      "token is [REDACTED] here",
    );
  });

  it("redacts every occurrence of a secret", () => {
    assert.equal(
      redactStrings("abc and abc and abc", ["abc"]),
      "[REDACTED] and [REDACTED] and [REDACTED]",
    );
  });

  it("redacts multiple distinct secrets", () => {
    assert.equal(
      redactStrings("ak=KEY1 sk=KEY2", ["KEY1", "KEY2"]),
      "ak=[REDACTED] sk=[REDACTED]",
    );
  });

  it("ignores empty-string entries in the secrets list", () => {
    assert.equal(redactStrings("hello world", ["", ""]), "hello world");
  });

  it("ignores empty-string entries even when other secrets are present", () => {
    assert.equal(
      redactStrings("a token KEY1 here", ["", "KEY1"]),
      "a token [REDACTED] here",
    );
  });

  it("treats secrets as literal substrings, not regex", () => {
    // a regex-flavoured secret should match itself literally, not act as a pattern
    assert.equal(
      redactStrings("the value .*+? appears", [".*+?"]),
      "the value [REDACTED] appears",
    );
  });

  it("handles secrets with special JSON / shell characters", () => {
    const secret = `{"a":"b"}|$()`;
    const input = `payload was ${secret} and again ${secret}`;
    assert.equal(
      redactStrings(input, [secret]),
      "payload was [REDACTED] and again [REDACTED]",
    );
  });

  it("does not redact when the secret is not present", () => {
    assert.equal(
      redactStrings("hello world", ["nope"]),
      "hello world",
    );
  });

  it("redacts overlapping-prefix secrets correctly when the longer one is listed first", () => {
    // If a long secret contains a shorter secret as a prefix, the longer one
    // gets redacted first; the shorter one then doesn't appear in the result.
    assert.equal(
      redactStrings("token=KEY12345 and short=KEY", ["KEY12345", "KEY"]),
      "token=[REDACTED] and short=[REDACTED]",
    );
  });
});
