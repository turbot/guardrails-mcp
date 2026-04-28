import { describe, it } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import {
  buildGraphqlEndpoint,
  defaultCredentialsPath,
  expandTilde,
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
demo-whitespace-workspace:
  workspace: "  https://demo-acme.cloud.turbot.com  "
  accessKey: AK_W
  secretKey: SK_W
demo-missing-secret:
  workspace: https://demo-acme.cloud.turbot.com
  accessKey: AK_X
demo-empty-fields:
  workspace: ""
  accessKey: ""
  secretKey: ""
demo-not-mapping: "this is a string entry, not a mapping"
"profile.with.dots":
  workspace: https://dotted.cloud.turbot.com
  accessKey: AK_DOT
  secretKey: SK_DOT
"profile with spaces":
  workspace: https://spacey.cloud.turbot.com
  accessKey: AK_SP
  secretKey: SK_SP
"profile/with/slashes":
  workspace: https://slashed.cloud.turbot.com
  accessKey: AK_SL
  secretKey: SK_SL
__proto__:
  workspace: https://attacker.example.com
  accessKey: AK_EVIL
  secretKey: SK_EVIL
`;

// Defines a YAML anchor under "_template" and merges it into a real profile.
// Verifies our access pattern reads merged values correctly without being
// thrown by the anchor-only key.
const ANCHOR_YAML = `
_template: &base
  accessKey: AK_FROM_ANCHOR
  secretKey: SK_FROM_ANCHOR
demo-merged:
  <<: *base
  workspace: https://merged.cloud.turbot.com
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

  it("trims surrounding whitespace before normalising", () => {
    assert.equal(
      buildGraphqlEndpoint("  https://demo.cloud.turbot.com  "),
      "https://demo.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("is idempotent across repeated invocations", () => {
    const once = buildGraphqlEndpoint("https://demo.cloud.turbot.com/");
    const twice = buildGraphqlEndpoint(once);
    assert.equal(twice, once);
  });
});

describe("expandTilde", () => {
  it("returns paths without ~ unchanged", () => {
    assert.equal(expandTilde("/etc/passwd"), "/etc/passwd");
    assert.equal(expandTilde("relative/path"), "relative/path");
    assert.equal(expandTilde(""), "");
  });

  it("expands a bare ~ to the home directory", () => {
    assert.equal(expandTilde("~"), os.homedir());
  });

  it("expands ~/foo to <home>/foo", () => {
    assert.equal(
      expandTilde("~/Documents/turbot.yml"),
      path.join(os.homedir(), "Documents", "turbot.yml"),
    );
  });

  it("expands ~\\foo for Windows-style configs", () => {
    assert.equal(
      expandTilde("~\\Documents\\turbot.yml"),
      path.join(os.homedir(), "Documents\\turbot.yml"),
    );
  });

  it("does not expand ~user-style paths (out of scope)", () => {
    assert.equal(expandTilde("~someuser/foo"), "~someuser/foo");
  });
});

describe("defaultCredentialsPath", () => {
  it("returns exactly path.join(homedir, .config, turbot, credentials.yml)", () => {
    assert.equal(
      defaultCredentialsPath(),
      path.join(os.homedir(), ".config", "turbot", "credentials.yml"),
    );
  });
});

describe("resolveConfig — direct env vars", () => {
  it("resolves when all three direct env vars are set", () => {
    const resolved = resolveConfig({ env: { ...VALID_DIRECT_ENV } });
    assert.deepEqual(resolved.config, { ...VALID_DIRECT_ENV });
    assert.equal(resolved.authMethod, "direct-env");
    assert.equal(resolved.profile, undefined);
    assert.equal(resolved.credentialsPath, undefined);
  });

  it("normalises a workspace-only TURBOT_GRAPHQL_ENDPOINT (no suffix)", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_GRAPHQL_ENDPOINT: "https://acme.cloud.turbot.com",
        TURBOT_ACCESS_KEY_ID: "AK",
        TURBOT_SECRET_ACCESS_KEY: "SK",
      },
    });
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("strips trailing slash from TURBOT_GRAPHQL_ENDPOINT", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_GRAPHQL_ENDPOINT: "https://acme.cloud.turbot.com/",
        TURBOT_ACCESS_KEY_ID: "AK",
        TURBOT_SECRET_ACCESS_KEY: "SK",
      },
    });
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("trims whitespace from TURBOT_GRAPHQL_ENDPOINT", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_GRAPHQL_ENDPOINT: "  https://acme.cloud.turbot.com  ",
        TURBOT_ACCESS_KEY_ID: "AK",
        TURBOT_SECRET_ACCESS_KEY: "SK",
      },
    });
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
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
        assert.match(err.message, /Alternatively, set TURBOT_CLI_PROFILE/);
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

  it("treats an empty-string TURBOT_CLI_PROFILE as not set", () => {
    const resolved = resolveConfig({
      env: { TURBOT_CLI_PROFILE: "", ...VALID_DIRECT_ENV },
    });
    assert.equal(resolved.authMethod, "direct-env");
  });

  it("treats whitespace-only TURBOT_CLI_PROFILE as not set", () => {
    const resolved = resolveConfig({
      env: { TURBOT_CLI_PROFILE: "   ", ...VALID_DIRECT_ENV },
    });
    assert.equal(resolved.authMethod, "direct-env");
  });
});

describe("resolveConfig — CLI profile", () => {
  it("loads credentials from the named profile and reports metadata", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-acme",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.deepEqual(resolved.config, {
      TURBOT_GRAPHQL_ENDPOINT:
        "https://demo-acme.cloud.turbot.com/api/latest/graphql",
      TURBOT_ACCESS_KEY_ID: "AK_GOOD",
      TURBOT_SECRET_ACCESS_KEY: "SK_GOOD",
    });
    assert.equal(resolved.authMethod, "cli-profile");
    assert.equal(resolved.profile, "demo-acme");
    assert.equal(resolved.credentialsPath, "/fake/path.yml");
  });

  it("trims whitespace from TURBOT_CLI_PROFILE before lookup", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "  demo-acme  ",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(resolved.profile, "demo-acme");
    assert.equal(resolved.config.TURBOT_ACCESS_KEY_ID, "AK_GOOD");
  });

  it("normalises a workspace value with a trailing slash", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-trailing-slash",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("normalises a workspace value with multiple trailing slashes", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-multiple-slashes",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("does not double-append when workspace already includes /api/latest/graphql", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-already-suffixed",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("normalises a suffixed workspace with a trailing slash", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-suffixed-trailing-slash",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("trims whitespace inside a quoted workspace value from the YAML", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-whitespace-workspace",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("CLI profile takes precedence over direct env vars when both are set", () => {
    const resolved = resolveConfig({
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
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://demo-acme.cloud.turbot.com/api/latest/graphql",
    );
    assert.equal(resolved.config.TURBOT_ACCESS_KEY_ID, "AK_GOOD");
    assert.equal(resolved.config.TURBOT_SECRET_ACCESS_KEY, "SK_GOOD");
  });

  it("defaults credentials path to defaultCredentialsPath() when env var is unset", () => {
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

  it("defaults credentials path when TURBOT_CLI_CREDENTIALS_PATH is empty string", () => {
    let receivedPath = "";
    resolveConfig({
      env: { TURBOT_CLI_PROFILE: "demo-acme", TURBOT_CLI_CREDENTIALS_PATH: "" },
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

  it("expands ~ in TURBOT_CLI_CREDENTIALS_PATH", () => {
    let receivedPath = "";
    resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-acme",
        TURBOT_CLI_CREDENTIALS_PATH: "~/Documents/turbot.yml",
      },
      readFile: (filePath) => {
        receivedPath = filePath;
        return SAMPLE_YAML;
      },
    });
    assert.equal(
      receivedPath,
      path.join(os.homedir(), "Documents", "turbot.yml"),
    );
  });

  it("trims whitespace from TURBOT_CLI_CREDENTIALS_PATH", () => {
    let receivedPath = "";
    resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-acme",
        TURBOT_CLI_CREDENTIALS_PATH: "  /custom/creds.yml  ",
      },
      readFile: (filePath) => {
        receivedPath = filePath;
        return SAMPLE_YAML;
      },
    });
    assert.equal(receivedPath, "/custom/creds.yml");
  });

  it("looks up profile names with dots", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "profile.with.dots",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(resolved.config.TURBOT_ACCESS_KEY_ID, "AK_DOT");
  });

  it("looks up profile names with spaces", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "profile with spaces",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(resolved.config.TURBOT_ACCESS_KEY_ID, "AK_SP");
  });

  it("looks up profile names with slashes", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "profile/with/slashes",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(SAMPLE_YAML),
    });
    assert.equal(resolved.config.TURBOT_ACCESS_KEY_ID, "AK_SL");
  });

  it("resolves YAML merge anchors (<<: *base)", () => {
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-merged",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(ANCHOR_YAML),
    });
    assert.equal(resolved.config.TURBOT_ACCESS_KEY_ID, "AK_FROM_ANCHOR");
    assert.equal(resolved.config.TURBOT_SECRET_ACCESS_KEY, "SK_FROM_ANCHOR");
    assert.equal(
      resolved.config.TURBOT_GRAPHQL_ENDPOINT,
      "https://merged.cloud.turbot.com/api/latest/graphql",
    );
  });

  it("strips a UTF-8 BOM from the credentials file", () => {
    const yamlWithBom =
      "﻿" +
      "demo-bom:\n" +
      "  workspace: https://bom.cloud.turbot.com\n" +
      "  accessKey: AK_BOM\n" +
      "  secretKey: SK_BOM\n";
    const resolved = resolveConfig({
      env: {
        TURBOT_CLI_PROFILE: "demo-bom",
        TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
      },
      readFile: stubReadFile(yamlWithBom),
    });
    assert.equal(resolved.config.TURBOT_ACCESS_KEY_ID, "AK_BOM");
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

  it("wraps fs EISDIR (path is a directory) errors with the path", () => {
    assert.throws(
      () =>
        resolveConfig({
          env: {
            TURBOT_CLI_PROFILE: "demo-acme",
            TURBOT_CLI_CREDENTIALS_PATH: "/some/dir",
          },
          readFile: failingReadFile(
            new Error("EISDIR: illegal operation on a directory, read"),
          ),
        }),
      /Failed to read credentials file \/some\/dir: EISDIR/,
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
      assert.equal(
        occurrences,
        1,
        `path appeared ${occurrences}x in: ${message}`,
      );
    }
  });

  it("never includes credential values in error messages", () => {
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

  describe("prototype-pollution defence", () => {
    it("does not pollute Object.prototype when YAML contains __proto__ as a top-level key", () => {
      // Parse + access without throwing pollution into Object.prototype.
      const probe = {} as Record<string, unknown>;
      assert.equal(probe.workspace, undefined);

      // Resolving __proto__ as a profile name should find the entry as an own
      // property of the parsed map (modern yaml does not pollute Object.prototype).
      const resolved = resolveConfig({
        env: {
          TURBOT_CLI_PROFILE: "__proto__",
          TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
        },
        readFile: stubReadFile(SAMPLE_YAML),
      });
      assert.equal(resolved.config.TURBOT_ACCESS_KEY_ID, "AK_EVIL");

      // After parsing, Object.prototype must still be untouched.
      const after = {} as Record<string, unknown>;
      assert.equal(after.workspace, undefined);
      assert.equal(after.accessKey, undefined);
    });

    it("does not return the prototype entry for a missing profile when the YAML contains __proto__", () => {
      // The YAML defines __proto__ but NOT 'fictional-profile'. The lookup
      // for 'fictional-profile' must use Object.hasOwn (or equivalent) so it
      // does not silently fall through to the prototype.
      assert.throws(
        () =>
          resolveConfig({
            env: {
              TURBOT_CLI_PROFILE: "fictional-profile",
              TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
            },
            readFile: stubReadFile(SAMPLE_YAML),
          }),
        /Profile 'fictional-profile' not found/,
      );
    });

    it("rejects 'toString' as a profile name (defaultchild on plain Object) so we don't read prototype methods", () => {
      assert.throws(
        () =>
          resolveConfig({
            env: {
              TURBOT_CLI_PROFILE: "toString",
              TURBOT_CLI_CREDENTIALS_PATH: "/fake/path.yml",
            },
            readFile: stubReadFile(SAMPLE_YAML),
          }),
        /Profile 'toString' not found/,
      );
    });
  });
});
