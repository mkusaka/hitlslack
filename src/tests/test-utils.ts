import { vi } from "vitest";

export function createMockWebClient() {
  return {
    auth: {
      test: vi.fn().mockResolvedValue({
        ok: true,
        team: "Test Team",
        user: "test-bot",
      }),
    },
    chat: {
      postMessage: vi.fn().mockResolvedValue({
        ok: true,
        ts: "1234567890.123456",
        channel: "C1234567890",
      }),
    },
    conversations: {
      replies: vi.fn().mockResolvedValue({
        ok: true,
        messages: [],
      }),
    },
  };
}

export function createMockSocketClient() {
  const handlers: { [key: string]: Function[] } = {};
  
  return {
    on: vi.fn((event: string, handler: Function) => {
      if (!handlers[event]) {
        handlers[event] = [];
      }
      handlers[event].push(handler);
    }),
    start: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    emit: (event: string, ...args: any[]) => {
      if (handlers[event]) {
        handlers[event].forEach(handler => handler(...args));
      }
    },
  };
}

export function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

export const mockConfig = {
  SLACK_BOT_TOKEN: "xoxb-test-token",
  SLACK_APP_TOKEN: "xapp-test-token",
  SLACK_CHANNEL_ID: "C1234567890",
  SLACK_USER_ID: "U1234567890",
  RESPONSE_TIMEOUT_MS: 5000,
};