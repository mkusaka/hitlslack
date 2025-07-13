import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockConfig } from "./test-utils.js";

// Use vi.hoisted to ensure mock functions are available before vi.mock
const { mockAuthTest, mockPostMessage, mockSocketOn, mockSocketStart, mockSocketDisconnect, socketEventHandlers } = vi.hoisted(() => {
  return {
    mockAuthTest: vi.fn(),
    mockPostMessage: vi.fn(),
    mockSocketOn: vi.fn(),
    mockSocketStart: vi.fn(),
    mockSocketDisconnect: vi.fn(),
    socketEventHandlers: {} as { [key: string]: Function[] }
  };
});

// Mock WebClient
vi.mock("@slack/web-api", () => {
  const WebClientMock = vi.fn();
  WebClientMock.prototype.auth = {
    test: mockAuthTest,
  };
  WebClientMock.prototype.chat = {
    postMessage: mockPostMessage,
  };
  WebClientMock.prototype.conversations = {
    replies: vi.fn().mockResolvedValue({
      ok: true,
      messages: [],
    }),
  };
  
  return { WebClient: WebClientMock };
});

// Mock SocketModeClient  
vi.mock("@slack/socket-mode", () => {
  const SocketModeClientMock = vi.fn();
  SocketModeClientMock.prototype.on = mockSocketOn;
  SocketModeClientMock.prototype.start = mockSocketStart;
  SocketModeClientMock.prototype.disconnect = mockSocketDisconnect;
  
  return { SocketModeClient: SocketModeClientMock };
});

vi.mock("../lib/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Now import the module being tested
import { SlackHumanSocketClient } from "../lib/slack-human-socket-client.js";

describe("SlackHumanSocketClient", () => {
  let client: SlackHumanSocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear event handlers
    for (const key in socketEventHandlers) {
      delete socketEventHandlers[key];
    }
    
    // Set up default mock responses
    mockAuthTest.mockResolvedValue({
      ok: true,
      team: "Test Team",
      user: "test-bot",
    });
    
    mockPostMessage.mockResolvedValue({
      ok: true,
      ts: "1234567890.123456",
      channel: "C1234567890",
    });
    
    mockSocketStart.mockResolvedValue(undefined);
    mockSocketDisconnect.mockResolvedValue(undefined);
    
    // Set up socket event handler
    mockSocketOn.mockImplementation((event: string, handler: Function) => {
      if (!socketEventHandlers[event]) {
        socketEventHandlers[event] = [];
      }
      socketEventHandlers[event].push(handler);
    });
    
    client = new SlackHumanSocketClient(mockConfig);
  });

  // Helper to emit socket events
  const emitSocketEvent = (event: string, data: any) => {
    if (socketEventHandlers[event]) {
      socketEventHandlers[event].forEach(handler => handler(data));
    }
  };

  describe("connect", () => {
    it("should successfully connect to Slack", async () => {
      await client.connect();

      expect(mockAuthTest).toHaveBeenCalled();
      expect(mockSocketStart).toHaveBeenCalled();
      expect(mockSocketOn).toHaveBeenCalledWith("message", expect.any(Function));
      expect(mockSocketOn).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockSocketOn).toHaveBeenCalledWith("disconnect", expect.any(Function));
    });

    it("should not reconnect if already connected", async () => {
      await client.connect();
      vi.clearAllMocks();
      await client.connect();

      expect(mockAuthTest).not.toHaveBeenCalled();
      expect(mockSocketStart).not.toHaveBeenCalled();
    });

    it("should throw error if authentication fails", async () => {
      mockAuthTest.mockResolvedValueOnce({ ok: false });

      await expect(client.connect()).rejects.toThrow("Slack authentication failed");
    });
  });

  describe("disconnect", () => {
    it("should disconnect socket client", async () => {
      await client.connect();
      await client.disconnect();

      expect(mockSocketDisconnect).toHaveBeenCalled();
    });

    it("should not error if not connected", async () => {
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });

  describe("askHuman", () => {
    beforeEach(async () => {
      await client.connect();
    });

    it("should post a message and return the response", async () => {
      const question = "What is the answer to life?";
      const expectedAnswer = "42";

      // Set up the promise before triggering the message
      const answerPromise = client.askHuman(question);

      // Wait for the message to be posted
      await new Promise(resolve => setTimeout(resolve, 10));

      // Get the message timestamp from the mock
      const postMessageCall = mockPostMessage.mock.calls[0];
      expect(postMessageCall).toBeDefined();
      
      const messageTs = "1234567890.123456"; // The mocked response ts

      // Simulate a response message
      emitSocketEvent("message", {
        event: {
          type: "message",
          channel: mockConfig.SLACK_CHANNEL_ID,
          user: mockConfig.SLACK_USER_ID,
          text: expectedAnswer,
          thread_ts: messageTs,
        },
        ack: vi.fn(),
      });

      const answer = await answerPromise;
      expect(answer).toBe(expectedAnswer);
      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: mockConfig.SLACK_CHANNEL_ID,
        text: `<@${mockConfig.SLACK_USER_ID}> ${question}`,
      });
    });

    it("should use existing thread for subsequent questions", async () => {
      // First question
      const firstAnswer = client.askHuman("First question");
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate response to establish thread
      emitSocketEvent("message", {
        event: {
          type: "message",
          channel: mockConfig.SLACK_CHANNEL_ID,
          user: mockConfig.SLACK_USER_ID,
          text: "First answer",
          thread_ts: "1234567890.123456",
        },
        ack: vi.fn(),
      });
      
      await firstAnswer;

      // Second question
      client.askHuman("Second question");
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPostMessage).toHaveBeenLastCalledWith({
        channel: mockConfig.SLACK_CHANNEL_ID,
        text: `<@${mockConfig.SLACK_USER_ID}> Second question`,
        thread_ts: "1234567890.123456",
      });
    });

    it("should timeout if no response received", async () => {
      const promise = client.askHuman("Timeout question");

      await expect(promise).rejects.toThrow("Response timeout after 5000ms");
    }, 10000);

    it("should ignore messages from other users", async () => {
      const answerPromise = client.askHuman("Test question");
      await new Promise(resolve => setTimeout(resolve, 10));

      // Message from wrong user
      emitSocketEvent("message", {
        event: {
          type: "message",
          channel: mockConfig.SLACK_CHANNEL_ID,
          user: "U9999999999", // Different user
          text: "Wrong answer",
          thread_ts: "1234567890.123456",
        },
        ack: vi.fn(),
      });

      // Message from correct user
      emitSocketEvent("message", {
        event: {
          type: "message",
          channel: mockConfig.SLACK_CHANNEL_ID,
          user: mockConfig.SLACK_USER_ID,
          text: "Correct answer",
          thread_ts: "1234567890.123456",
        },
        ack: vi.fn(),
      });

      const answer = await answerPromise;
      expect(answer).toBe("Correct answer");
    });

    it("should ignore non-thread messages", async () => {
      const answerPromise = client.askHuman("Test question");
      await new Promise(resolve => setTimeout(resolve, 10));

      // Message without thread_ts
      emitSocketEvent("message", {
        event: {
          type: "message",
          channel: mockConfig.SLACK_CHANNEL_ID,
          user: mockConfig.SLACK_USER_ID,
          text: "Non-thread message",
        },
        ack: vi.fn(),
      });

      // Still waiting for response
      await expect(Promise.race([
        answerPromise,
        new Promise(resolve => setTimeout(() => resolve("timeout"), 100))
      ])).resolves.toBe("timeout");
    });

    it("should handle postMessage errors", async () => {
      mockPostMessage.mockRejectedValueOnce(new Error("API error"));

      await expect(client.askHuman("Error question")).rejects.toThrow("API error");
    });
  });

  describe("resetThread", () => {
    it("should clear current thread", async () => {
      await client.connect();
      
      // Create a thread
      const firstAnswer = client.askHuman("First question");
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate response
      emitSocketEvent("message", {
        event: {
          type: "message",
          channel: mockConfig.SLACK_CHANNEL_ID,
          user: mockConfig.SLACK_USER_ID,
          text: "Answer",
          thread_ts: "1234567890.123456",
        },
        ack: vi.fn(),
      });
      
      await firstAnswer;

      // Reset thread
      client.resetThread();

      // Next question should create new thread
      mockPostMessage.mockClear();
      const secondAnswer = client.askHuman("New thread question");
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: mockConfig.SLACK_CHANNEL_ID,
        text: `<@${mockConfig.SLACK_USER_ID}> New thread question`,
      });
      expect(mockPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ thread_ts: "1234567890.123456" })
      );
      
      // Clean up by responding to avoid timeout
      emitSocketEvent("message", {
        event: {
          type: "message",
          channel: mockConfig.SLACK_CHANNEL_ID,
          user: mockConfig.SLACK_USER_ID,
          text: "New answer",
          thread_ts: "1234567890.123456",
        },
        ack: vi.fn(),
      });
      
      await secondAnswer;
    });
  });
});