import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../slack-config.js";

describe("SlackConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadConfig", () => {
    it("should load valid configuration", () => {
      process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
      process.env.SLACK_APP_TOKEN = "xapp-test-token";
      process.env.SLACK_CHANNEL_ID = "C1234567890";
      process.env.SLACK_USER_ID = "U1234567890";
      process.env.RESPONSE_TIMEOUT_MS = "10000";

      const config = loadConfig();

      expect(config).toEqual({
        SLACK_BOT_TOKEN: "xoxb-test-token",
        SLACK_APP_TOKEN: "xapp-test-token",
        SLACK_CHANNEL_ID: "C1234567890",
        SLACK_USER_ID: "U1234567890",
        RESPONSE_TIMEOUT_MS: 10000,
      });
    });

    it("should use default timeout when not specified", () => {
      process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
      process.env.SLACK_APP_TOKEN = "xapp-test-token";
      process.env.SLACK_CHANNEL_ID = "C1234567890";
      process.env.SLACK_USER_ID = "U1234567890";

      const config = loadConfig();

      expect(config.RESPONSE_TIMEOUT_MS).toBe(300000); // 5 minutes
    });

    it("should throw error when SLACK_BOT_TOKEN is missing", () => {
      process.env.SLACK_APP_TOKEN = "xapp-test-token";
      process.env.SLACK_CHANNEL_ID = "C1234567890";
      process.env.SLACK_USER_ID = "U1234567890";
      delete process.env.SLACK_BOT_TOKEN;

      expect(() => loadConfig()).toThrow();
    });

    it("should throw error when SLACK_APP_TOKEN is missing", () => {
      process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
      process.env.SLACK_CHANNEL_ID = "C1234567890";
      process.env.SLACK_USER_ID = "U1234567890";

      expect(() => loadConfig()).toThrow("SLACK_APP_TOKEN: Required");
    });

    it("should throw error when SLACK_CHANNEL_ID is missing", () => {
      process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
      process.env.SLACK_APP_TOKEN = "xapp-test-token";
      process.env.SLACK_USER_ID = "U1234567890";

      expect(() => loadConfig()).toThrow("SLACK_CHANNEL_ID: Required");
    });

    it("should throw error when SLACK_USER_ID is missing", () => {
      process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
      process.env.SLACK_APP_TOKEN = "xapp-test-token";
      process.env.SLACK_CHANNEL_ID = "C1234567890";

      expect(() => loadConfig()).toThrow("SLACK_USER_ID: Required");
    });

    it("should throw error when timeout is invalid", () => {
      process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
      process.env.SLACK_APP_TOKEN = "xapp-test-token";
      process.env.SLACK_CHANNEL_ID = "C1234567890";
      process.env.SLACK_USER_ID = "U1234567890";
      process.env.RESPONSE_TIMEOUT_MS = "invalid";

      expect(() => loadConfig()).toThrow();
    });

    it("should throw error when timeout is negative", () => {
      process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
      process.env.SLACK_APP_TOKEN = "xapp-test-token";
      process.env.SLACK_CHANNEL_ID = "C1234567890";
      process.env.SLACK_USER_ID = "U1234567890";
      process.env.RESPONSE_TIMEOUT_MS = "-1000";

      expect(() => loadConfig()).toThrow();
    });
  });
});
