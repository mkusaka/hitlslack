import { WebClient } from "@slack/web-api";
import { SocketModeClient } from "@slack/socket-mode";
import logger from "./logger.js";
import type { SlackConfig } from "../slack-config.js";

interface PendingQuestion {
  question: string;
  threadTs: string;
  resolve: (answer: string) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

export class SlackHumanSocketClient {
  private webClient: WebClient;
  private socketClient: SocketModeClient;
  private config: SlackConfig;
  private pendingQuestions: Map<string, PendingQuestion> = new Map();
  private currentThreadTs?: string;
  private isConnected = false;

  constructor(config: SlackConfig) {
    this.config = config;
    this.webClient = new WebClient(config.SLACK_BOT_TOKEN);
    this.socketClient = new SocketModeClient({
      appToken: config.SLACK_APP_TOKEN,
      logLevel: (process.env.LOG_LEVEL || "info") as any,
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // Test web client connection
      const authResult = await this.webClient.auth.test();
      if (!authResult.ok) {
        throw new Error("Slack authentication failed");
      }
      logger.info("Successfully authenticated with Slack", {
        team: authResult.team,
        user: authResult.user,
      });

      // Set up socket mode event handlers
      this.socketClient.on("message", async ({ event, ack }) => {
        await ack();
        
        if (event.type === "message" && event.channel === this.config.SLACK_CHANNEL_ID) {
          await this.handleMessage(event);
        }
      });

      this.socketClient.on("error", (error) => {
        logger.error("Socket mode error:", error);
      });

      this.socketClient.on("disconnect", () => {
        logger.warn("Socket mode disconnected");
        this.isConnected = false;
      });

      // Start socket mode connection
      await this.socketClient.start();
      this.isConnected = true;
      logger.info("Socket mode client connected");
    } catch (error) {
      logger.error("Failed to connect to Slack:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.socketClient && this.isConnected) {
      await this.socketClient.disconnect();
      this.isConnected = false;
      logger.info("Socket mode client disconnected");
    }
  }

  private async handleMessage(event: any): Promise<void> {
    // Only process messages from the specified user
    if (event.user !== this.config.SLACK_USER_ID) return;
    
    // Only process thread replies
    if (!event.thread_ts) return;

    // Check if this is a response to one of our pending questions
    const pending = this.pendingQuestions.get(event.thread_ts);
    if (pending) {
      const answer = event.text || "";
      
      // Clear timeout and resolve
      clearTimeout(pending.timeoutId);
      pending.resolve(answer);
      this.pendingQuestions.delete(event.thread_ts);

      logger.info("Received response from human", {
        question: pending.question,
        answer: answer.substring(0, 100),
      });
    }
  }

  async askHuman(question: string): Promise<string> {
    if (!this.isConnected) {
      await this.connect();
    }

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
            message = await this.webClient.chat.postMessage({
              channel: this.config.SLACK_CHANNEL_ID,
              text: messageText,
              thread_ts: this.currentThreadTs,
            });
          } else {
            // Create new message (will become a thread when user replies)
            message = await this.webClient.chat.postMessage({
              channel: this.config.SLACK_CHANNEL_ID,
              text: messageText,
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
            threadTs: message.ts,
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

  resetThread(): void {
    this.currentThreadTs = undefined;
    logger.info("Thread reset for new conversation");
  }
}