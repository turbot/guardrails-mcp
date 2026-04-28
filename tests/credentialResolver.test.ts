import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGraphqlEndpoint,
  defaultCredentialsPath,
  resolveConfig,
} from "../src/config/credentialResolver.js";

const VALID_DIRECT_ENV = {
  TURBOT_GRAPHQL_ENDPOINT: "https://acme.cloud.turbot.com/api/latest/graphql",
  TURBOT_ACCESS_KEY_ID: "AK_TEST",
  TURBOT_SECRET_ACCESS_KEY: "SK_TEST",
} as const;

const SAMPLE_YAML = `
demo-acme:
  workspace: https://demo-acme.cloud.turbot.com
  accessKey: AK_GOOD
  secretKey: SK_GOOD
demo-trailing-slash:
  workspace: https://demo-acme.cloud.turbot.com/
  accessKey: AK_TS
  secretKey: SK_TS
demo-multiple-slashes:
  workspace: https://demo-acme.cloud.turbot.com///
  accessKey: AK_MS
  secretKey: SK_MS
demo-already-suffixed:
  workspace: https://demo-acme.cloud.turbot.com/api/latest/graphql
  accessKey: AK_AS
  secretKey: SK_AS
demo-suffixed-trailing-slash:
  workspace: https://demo-acme.cloud.turbot.com/api/latest/graphql/
  accessKey: AK_STS
  secretKey: SK_STS
demo-missing-secret:
  workspace: https://demo-acme.cloud.turbot.com
  accessKey: AK_X
demo-empty-fields:
  workspace: ""
  accessKey: ""
  secretKey: ""
demo-not-mapping: "this is a string entry, not a mapping"
`;

const stubReadFile =
  (content: string) =>
  (_filePath: string): string =>
    content;

const failingReadFile =
  (err: Error) =>
  (_filePath: string): string => {
    throw err;
  };

describe("buildGraphqlEndpoint", () => {
  it("appends /api/latest/graphql to a bare workspace URL", () => {
    assert.equal(
      buildGraphqlEndpoint("https://demo.cloud.turbot.com"),
      "https://demo.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("strips a single trailing slash before appending", () => {
    assert.equal(
      buildGraphqlEndpoint("https://demo.cloud.turbot.com/"),
      "https://demo.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("strips multiple trailing slashes before appending", () => {
    assert.equal(
      buildGraphqlEndpoint("https://demo.cloud.turbot.com///"),
      "https://demo.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("does not double-append if /api/latest/graphql is already present", () => {
    assert.equal(
      buildGraphqlEndpoint("https://demo.cloud.turbot.com/api/latest/graphql"),
      "https://demo.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("strips trailing slash from an already-suffixed URL", () => {
    assert.equal(
      buildGraphqlEndpoint("https://demo.cloud.turbot.com/api/latest/graphql/"),
      "https://demo.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("is idempotent across repeated invocations", () => {
    const once = buildGraphqlEndpoint("https://demo.cloud.turbot.com/");
    const twice = buildGraphqlEndpoint(once);
    assert.equal(twice, once);
  });
});

describe("defaultCredentialsPath", () => {
  it("returns a path under the user's home directory", () => {
    const p = defaultCredentialsPath();
    assert.ok(p.endsWith("/.config/turbot/credentials.yml") || p.endsWith("\\.config\\turbot\\credentials.yml"));
  });
});

describe("resolveConfig — direct env vars", () => {
  it("resolves when all three direct env vars are set", () => {
    const config = resolveConfig({ env: { ...VALID_DIRECT_ENV } });
    assert.deepEqual(config, { ...VALID_DIRECT_ENV });
  });

  it("normalises a workspace-only TURBOT_GRAPHQL_ENDPOINT (no suffix)", () => {
    const config = resolveConfig({
      env: {
        TURBOT_GRAPHQL_ENDPOINT: "https://acme.cloud.turbot.com",
        TURBOT_ACCESS_KEY_ID: "AK",
        TURBOT_SECRET_ACCESS_KEY: "SK",
      },
    });
    assert.equal(
      config.TURBOT_GRAPHQL_ENDPOINT,
      "https://acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("strips trailing slash from TURBOT_GRAPHQL_ENDPOINT", () => {
    const config = resolveConfig({
      env: {
        TURBOT_GRAPHQL_ENDPOINT: "https://acme.cloud.turbot.com/",
        TURBOT_ACCESS_KEY_ID: "AK",
        TURBOT_SECRET_ACCESS_KEY: "SK",
      },
    });
    assert.equal(
      config.TURBOT_GRAPHQL_ENDPOINT,
      "https://acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("throws listing all missing vars when none are set", () => {
    assert.throws(
      () => resolveConfig({ env: {} }),
      /TURBOT_GRAPHQL_ENDPOINT.*TURBOT_ACCESS_KEY_ID.*TURBOT_SECRET_ACCESS_KEY/s,
    );
  });

  it("throws listing only the actually missing vars on partial config", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_GRAPHQL_ENDPOINT: "https://x.example.com/api/latest/graphql",
            TURBOT_ACCESS_KEY_ID: "AK",
          },
        }),
      (err: unknown) => {
        if (!(err instanceof Error)) return false;
        assert.match(err.message, /TURBOT_SECRET_ACCESS_KEY/);
        assert.doesNotMatch(err.message, /TURBOT_ACCESS_KEY_ID]/);
        assert.match(
          err.message,
          /Alternatively, set TURBOT_CLI_PROFILE/,
        );
        return true;
      },
    );
  });

  it("treats empty-string env vars as missing", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_GRAPHQL_ENDPOINT: "",
            TURBOT_ACCESS_KEY_ID: "",
            TURBOT_SECRET_ACCESS_KEY: "",
          },
        }),
      /Missing required environment variables/,
    );
  });
});

describe("resolveConfig — CLI profile", () => {
  it("loads credentials from the named profile", () => {
    const config = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-acme",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.deepEqual(config, {
      TURBOT_GRAPHQL_ENDPOINT:
        "https://demo-acme.cloud.turbot.com/api/latest/graphql",
      TURBOT_ACCESS_KEY_ID: "AK_GOOD",
      TURBOT_SECRET_ACCESS_KEY: "SK_GOOD",
    });
  });

  it("normalises a workspace value with a trailing slash", () => {
    const config = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-trailing-slash",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("normalises a workspace value with multiple trailing slashes", () => {
    const config = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-multiple-slashes",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("does not double-append when workspace already includes /api/latest/graphql", () => {
    const config = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-already-suffixed",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("normalises a suffixed workspace with a trailing slash", () => {
    const config = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-suffixed-trailing-slash",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("CLI profile takes precedence over direct env vars when both are set", () => {
    const config = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-acme",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
        TURBOT_GRAPHQL_ENDPOINT:
          "https://OVERRIDE.cloud.turbot.com/api/latest/graphql",
        TURBOT_ACCESS_KEY_ID: "AK_OVERRIDE",
        TURBOT_SECRET_ACCESS_KEY: "SK_OVERRIDE",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
    assert.equal(config.TURBOT_ACCESS_KEY_ID, "AK_GOOD");
    assert.equal(config.TURBOT_SECRET_ACCESS_KEY, "SK_GOOD");
  });

  it("defaults credentials path to ~/.config/turbot/credentials.yml when env var is unset", () => {
    let receivedPath = "";
    resolveConfig({
      env: { TURBOT_CLI_PROFILE: "demo-acme" },
      readFile: (filePath) => {
        receivedPath = filePath;
        return SAMPLE_YAML;
      },
    });
    assert.equal(receivedPath, defaultCredentialsPath());
  });

  it("uses TURBOT_CLI_CREDENTIALS_PATH when set", () => {
    let receivedPath = "";
    resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-acme",
        TURBOT_CLI_CREDENTIALS_PATH: "/custom/creds.yml",
      },
      readFile: (filePath) => {
        receivedPath = filePath;
        return SAMPLE_YAML;
      },
    });
    assert.equal(receivedPath, "/custom/creds.yml");
  });

  it("throws when the named profile is not in the file", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "does-not-exist",
            TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
          },
          readFile: stubReadFile(SAMPLE_YAML),
        }),
      /Profile 'does-not-exist' not found in credentials file \/fake\/path.yml/,
    );
  });

  it("throws naming the missing field(s) when a profile is incomplete", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "demo-missing-secret",
            TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
          },
          readFile: stubReadFile(SAMPLE_YAML),
        }),
      /missing required field\(s\): secretKey/,
    );
  });

  it("treats empty-string profile fields as missing", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "demo-empty-fields",
            TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
          },
          readFile: stubReadFile(SAMPLE_YAML),
        }),
      /missing required field\(s\): workspace, accessKey, secretKey/,
    );
  });

  it("throws when the YAML root is a string, not a mapping", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "demo-acme",
            TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
          },
          readFile: stubReadFile("just-a-string"),
        }),
      /not a valid YAML mapping/,
    );
  });

  it("throws when the YAML root is an array, not a mapping", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "demo-acme",
            TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
          },
          readFile: stubReadFile("- one\n- two\n"),
        }),
      /not a valid YAML mapping/,
    );
  });

  it("throws when a named entry is itself not a mapping", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "demo-not-mapping",
            TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
          },
          readFile: stubReadFile(SAMPLE_YAML),
        }),
      /Profile 'demo-not-mapping' in \/fake\/path.yml is not a valid mapping/,
    );
  });

  it("wraps fs read errors with the path", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "demo-acme",
            TURBOT_CLI_CREDENTIALS_PATH: "/no/such/file.yml",
          },
          readFile: failingReadFile(
            new Error("ENOENT: no such file or directory"),
          ),
        }),
      /Failed to read credentials file \/no\/such\/file.yml: ENOENT: no such file or directory/,
    );
  });

  it("wraps YAML parse errors with the path", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "demo-acme",
            TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
          },
          readFile: stubReadFile("foo: [unterminated"),
        }),
      /Failed to parse YAML in \/fake\/path.yml/,
    );
  });

  it("does not include the path twice in profile-not-found errors", () => {
    try {
      resolveConfig({
        env: {
          TURBOT_CLI_PROFILE: "missing",
          TURBOT_CLI_CREDENTIALS_PATH: "/some/path.yml",
        },
        readFile: stubReadFile(SAMPLE_YAML),
      });
      assert.fail("expected throw");
    } catch (err) {
      const message = (err as Error).message;
      const occurrences = (message.match(/\/some\/path\.yml/g) ?? []).length;
      assert.equal(occurrences, 1, `path appeared ${occurrences}× in: ${message}`);
    }
  });

  it("never includes credential values in error messages", () => {
    // Profile values include AK_GOOD / SK_GOOD; if they ever leak into an
    // error path, this catches it.
    try {
      resolveConfig({
        env: {
          TURBOT_CLI_PROFILE: "demo-missing-secret",
          TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
        },
        readFile: stubReadFile(SAMPLE_YAML),
      });
      assert.fail("expected throw");
    } catch (err) {
      const message = (err as Error).message;
      assert.doesNotMatch(message, /AK_X|SK_GOOD|AK_GOOD/);
    }
  });
});
