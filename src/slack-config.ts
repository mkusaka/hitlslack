import { z } from "zod";
import logger from "./lib/logger.js";

const configSchema = z.object({
  SLACK_BOT_TOKEN: z.string().min(1, "SLACK_BOT_TOKEN is required"),
  SLACK_APP_TOKEN: z.string().min(1, "SLACK_APP_TOKEN is required"),
  SLACK_CHANNEL_ID: z.string().min(1, "SLACK_CHANNEL_ID is required"),
  SLACK_USER_ID: z.string().min(1, "SLACK_USER_ID is required"),
  RESPONSE_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 300000)) // Default 5 minutes
    .pipe(z.number().positive()),
});

export type SlackConfig = z.infer<typeof configSchema>;

export function loadConfig(): SlackConfig {
  try {
    const config = configSchema.parse({
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
      SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN,
      SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
      SLACK_USER_ID: process.env.SLACK_USER_ID,
      RESPONSE_TIMEOUT_MS: process.env.RESPONSE_TIMEOUT_MS,
    });

    logger.debug("Configuration loaded successfully", {
      channelId: config.SLACK_CHANNEL_ID,
      userId: config.SLACK_USER_ID,
      timeoutMs: config.RESPONSE_TIMEOUT_MS,
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path}: ${issue.message}`).join(", ");
      throw new Error(`Configuration validation failed: ${issues}`);
    }
    throw error;
  }
}