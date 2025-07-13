#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import { config as dotenvConfig } from "dotenv";
import logger from "./lib/logger.js";
import { loadConfig } from "./slack-config.js";
import { SlackHumanSocketClient } from "./lib/slack-human-socket-client.js";

// Load environment variables
dotenvConfig();

// Read package.json for version
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const serverInstructions = `
This server enables AI assistants to ask questions to humans via Slack and wait for their responses.

Key features:
- Sends questions to a specific Slack channel
- Mentions a specific user to ensure they see the question
- Creates a thread for the conversation
- Waits for the user's response (with configurable timeout)
- Returns the human's answer back to the AI

Use this tool when you need:
- Information that requires human knowledge or judgment
- Clarification on ambiguous requirements
- Confirmation before taking significant actions
- Personal or context-specific information
- Access to resources or systems the AI cannot directly access

The tool will maintain conversation context within a single thread until reset.
`;

async function main() {
  try {
    // Load configuration
    const config = loadConfig();

    // Initialize Slack client
    const slackClient = new SlackHumanSocketClient(config);
    await slackClient.connect();

    // Create MCP server
    const serverOptions: ServerOptions = {
      capabilities: {
        tools: {},
      },
      instructions: serverInstructions,
    };

    const server = new McpServer(
      {
        name: "hitlslack",
        version: packageJson.version,
      },
      serverOptions
    );

    // Server instructions will be shown in tool descriptions

    // Register the ask_human tool
    server.tool(
      "ask_human",
      "Ask a question to a human via Slack and wait for their response",
      {
        question: z.string().describe("The question to ask the human"),
      },
      async ({ question }) => {
        try {
          logger.info("Tool invoked: ask_human", { question });
          const answer = await slackClient.askHuman(question);

          return {
            content: [
              {
                type: "text",
                text: answer,
              },
            ],
            isError: false,
          };
        } catch (error) {
          logger.error("Error in ask_human tool:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          return {
            content: [
              {
                type: "text",
                text: `Failed to get response: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Register reset_thread tool for starting new conversations
    server.tool(
      "reset_thread",
      "Reset the conversation thread to start a new topic",
      {},
      async () => {
        try {
          slackClient.resetThread();

          return {
            content: [
              {
                type: "text",
                text: "Thread reset. Next question will start a new conversation.",
              },
            ],
            isError: false,
          };
        } catch (error) {
          logger.error("Error in reset_thread tool:", error);

          return {
            content: [
              {
                type: "text",
                text: "Failed to reset thread",
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Set up transport and connect
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info("MCP server started successfully");

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Shutting down server...");
      await slackClient.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Unhandled error:", error);
  process.exit(1);
});
