import { WebClient } from "@slack/web-api";
import logger from "./logger.js";
import type { SlackConfig } from "../slack-config.js";

interface PendingQuestion {
  question: string;
  threadTs?: string;
  resolve: (answer: string) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

export class SlackHumanClient {
  private client: WebClient;
  private config: SlackConfig;
  private pendingQuestions: Map<string, PendingQuestion> = new Map();
  private currentThreadTs?: string;

  constructor(config: SlackConfig) {
    this.config = config;
    this.client = new WebClient(config.SLACK_BOT_TOKEN);
    this.startListening();
  }

  private startListening() {
    // Poll for messages in threads where we've asked questions
    setInterval(async () => {
      try {
        await this.checkForResponses();
      } catch (error) {
        logger.error("Error checking for responses:", error);
      }
    }, 5000); // Poll every 5 seconds
  }

  private async checkForResponses() {
    for (const [messageTs, pending] of this.pendingQuestions.entries()) {
      if (!pending.threadTs) continue;

      try {
        const result = await this.client.conversations.replies({
          channel: this.config.SLACK_CHANNEL_ID,
          ts: pending.threadTs,
        });

        if (result.messages && result.messages.length > 1) {
          // Find messages from the specified user that came after our question
          const userResponses = result.messages
            .slice(1) // Skip the first message (our question)
            .filter((msg) => msg.user === this.config.SLACK_USER_ID);

          if (userResponses.length > 0) {
            const latestResponse = userResponses[userResponses.length - 1];
            const answer = latestResponse.text || "";

            // Clear timeout and resolve
            clearTimeout(pending.timeoutId);
            pending.resolve(answer);
            this.pendingQuestions.delete(messageTs);

            logger.info("Received response from human", {
              question: pending.question,
              answer: answer.substring(0, 100),
            });
          }
        }
      } catch (error) {
        logger.error("Error checking thread replies:", error);
      }
    }
  }

  async askHuman(question: string): Promise<string> {
    logger.info("Asking human a question", { question });

    return new Promise((resolve, reject) => {
      // Run async operations
      (async () => {
        try {
          // Format the message with user mention
          const messageText = `<@${this.config.SLACK_USER_ID}> ${question}`;

          let message;
          if (this.currentThreadTs) {
            // Reply to existing thread
            message = await this.client.chat.postMessage({
              channel: this.config.SLACK_CHANNEL_ID,
              text: messageText,
              thread_ts: this.currentThreadTs,
            });
          } else {
            // Create new thread
            message = await this.client.chat.postMessage({
              channel: this.config.SLACK_CHANNEL_ID,
              text: messageText,
              thread_ts: undefined,
            });
            this.currentThreadTs = message.ts;
          }

          if (!message.ts) {
            throw new Error("Failed to post message to Slack");
          }

          // Set up timeout
          const timeoutId = setTimeout(() => {
            this.pendingQuestions.delete(message.ts!);
            reject(new Error(`Response timeout after ${this.config.RESPONSE_TIMEOUT_MS}ms`));
          }, this.config.RESPONSE_TIMEOUT_MS);

          // Store pending question
          this.pendingQuestions.set(message.ts, {
            question,
            threadTs: this.currentThreadTs,
            resolve,
            reject,
            timeoutId,
          });

          logger.debug("Question posted to Slack", {
            messageTs: message.ts,
            threadTs: this.currentThreadTs,
          });
        } catch (error) {
          logger.error("Failed to post question to Slack:", error);
          reject(error);
        }
      })();
    });
  }

  async testConnection(): Promise<void> {
    try {
      const result = await this.client.auth.test();
      if (!result.ok) {
        throw new Error("Slack authentication failed");
      }
      logger.info("Successfully connected to Slack", {
        team: result.team,
        user: result.user,
      });
    } catch (error) {
      logger.error("Failed to connect to Slack:", error);
      throw error;
    }
  }

  resetThread(): void {
    this.currentThreadTs = undefined;
    logger.info("Thread reset for new conversation");
  }
}
