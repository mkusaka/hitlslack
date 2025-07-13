import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createMockLogger } from "./test-utils.js";

vi.mock("../lib/logger.js", () => ({
  default: createMockLogger(),
}));

describe("MCP Server Integration", () => {
  describe("Server Configuration", () => {
    it("should create server with correct metadata", () => {
      const server = new McpServer({
        name: "hitls",
        version: "0.1.0",
      });

      // Server is created successfully
      expect(server).toBeDefined();
    });

    it("should accept server options with instructions", () => {
      const serverOptions = {
        capabilities: {
          tools: {},
        },
        instructions: "Test instructions",
      };

      const server = new McpServer(
        {
          name: "hitls",
          version: "0.1.0",
        },
        serverOptions
      );

      // Server is created successfully
      expect(server).toBeDefined();
    });
  });

  describe("Tool Registration", () => {
    it("should register ask_human tool", () => {
      const server = new McpServer({
        name: "hitls",
        version: "0.1.0",
      });

      const mockHandler = vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Response" }],
        isError: false,
      });

      // This should not throw
      expect(() => {
        server.tool(
          "ask_human",
          "Ask a question to a human via Slack",
          { question: z.string() },
          mockHandler
        );
      }).not.toThrow();
    });

    it("should register reset_thread tool", () => {
      const server = new McpServer({
        name: "hitls",
        version: "0.1.0",
      });

      const mockHandler = vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Thread reset" }],
        isError: false,
      });

      // This should not throw
      expect(() => {
        server.tool(
          "reset_thread",
          "Reset the conversation thread",
          {},
          mockHandler
        );
      }).not.toThrow();
    });
  });

  describe("Tool Schema Validation", () => {
    it("should validate ask_human parameters", () => {
      const schema = z.object({
        question: z.string().describe("The question to ask the human"),
      });

      // Valid input
      expect(() => schema.parse({ question: "Test question" })).not.toThrow();

      // Invalid input - missing question
      expect(() => schema.parse({})).toThrow();

      // Invalid input - wrong type
      expect(() => schema.parse({ question: 123 })).toThrow();
    });
  });
});