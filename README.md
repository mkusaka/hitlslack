# hitlslack - Human-in-the-Loop Slack

An MCP (Model Context Protocol) server that enables AI assistants to ask questions to humans via Slack and wait for their responses. This allows AI systems to request human input when they need clarification, confirmation, or access to information only humans can provide.

## Features

- 🤖 **Seamless AI-Human Communication**: AI assistants can ask questions and receive human responses
- 💬 **Slack Integration**: Uses Slack threads for organized conversations
- ⏱️ **Configurable Timeouts**: Set custom response timeouts for your use case
- 🔄 **Real-time Updates**: Uses Slack Socket Mode for instant message delivery
- 🧵 **Thread Management**: Maintains conversation context within threads
- 📝 **Type-safe**: Written in TypeScript with full type safety

## Installation

```bash
npm install -g hitlslack
```

Or use directly with npx:

```bash
npx hitlslack
```

## Prerequisites

### Slack App Setup

1. **Create a Slack App**:
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App" > "From scratch"
   - Name your app and select your workspace

2. **Enable Socket Mode**:
   - Go to "Socket Mode" in the left sidebar
   - Toggle "Enable Socket Mode" to ON
   - Click "Generate" under App Level Tokens
   - Token Name: `socket-mode` (or any name you prefer)
   - Add Scope: `connections:write`
   - Click "Generate"
   - Copy and save the token (starts with `xapp-1-`)
   - This is your `SLACK_APP_TOKEN`

3. **Configure OAuth & Permissions**:
   - Go to "OAuth & Permissions" in the left sidebar
   - Scroll down to "Scopes" section
   - Under "Bot Token Scopes", click "Add an OAuth Scope"
   - Add these scopes:
     - `chat:write` - Send messages as @yourapp
     - `channels:history` - View messages and other content in public channels
     - `channels:read` - View basic information about public channels
     - `users:read` - View people in a workspace
   - Scroll up and click "Install to Workspace"
   - Review permissions and click "Allow"
   - Copy and save the "Bot User OAuth Token" (starts with `xoxb-`)
   - This is your `SLACK_BOT_TOKEN`

4. **Enable Event Subscriptions**:
   - Go to "Event Subscriptions" in the left sidebar
   - Toggle "Enable Events" to ON
   - Under "Subscribe to bot events", click "Add Bot User Event"
   - Add `message.channels` - Listen for messages in public channels
   - Click "Save Changes" at the bottom
   - Note: Socket Mode apps don't need a Request URL

5. **Add Bot to Channel**:
   - In Slack, go to the channel where you want to use the bot
   - Type `/invite @YourBotName` (replace with your app's name)
   - The bot must be in the channel to read messages

## Configuration

### Environment Variables

Create a `.env` file or set these environment variables:

```bash
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_CHANNEL_ID=C1234567890  # Channel where questions will be posted
SLACK_USER_ID=U1234567890      # User to mention and accept responses from

# Optional
RESPONSE_TIMEOUT_MS=300000     # Response timeout (default: 5 minutes)
LOG_LEVEL=info                 # Log level (default: info)
```

### Finding IDs

#### Channel ID

1. In Slack, right-click on the channel name
2. Select "View channel details"
3. Scroll to the bottom
4. You'll see "Channel ID: C1234567890"
5. Copy this ID (starts with C)

#### User ID

1. Click on the user's profile picture or name
2. Click the three dots (...) "More actions"
3. Select "Copy member ID"
4. The ID will be copied to clipboard (starts with U)

Alternatively:

- Go to your workspace settings
- Click "Manage members"
- Click on a member
- The URL will contain their ID: `...member/U1234567890`

## Usage

### Quick Start with Claude CLI

```bash
claude mcp add slack-human \
  -s user \
  -e SLACK_BOT_TOKEN='xoxb-your-bot-token' \
  -e SLACK_APP_TOKEN='xapp-your-app-token' \
  -e SLACK_CHANNEL_ID='C1234567890' \
  -e SLACK_USER_ID='U1234567890' \
  -- npx -y hitlslack@latest
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slack-human": {
      "command": "npx",
              "args": ["hitlslack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
        "SLACK_APP_TOKEN": "xapp-your-app-token",
        "SLACK_CHANNEL_ID": "C1234567890",
        "SLACK_USER_ID": "U1234567890"
      }
    }
  }
}
```

### Claude Code Configuration

1. Set environment variables:

   ```bash
   export SLACK_BOT_TOKEN="xoxb-your-bot-token"
   export SLACK_APP_TOKEN="xapp-your-app-token"
   export SLACK_CHANNEL_ID="C1234567890"
   export SLACK_USER_ID="U1234567890"
   ```

2. Configure in Claude Code settings

## Available Tools

### `ask_human`

Ask a question to a human via Slack and wait for their response.

**Parameters:**

- `question` (string, required): The question to ask the human

**Example:**

```
AI: "I need to ask a human something"
Tool: ask_human({ question: "What environment should I deploy to?" })
Slack: "@user What environment should I deploy to?"
User: "Deploy to staging first"
Response: "Deploy to staging first"
```

### `reset_thread`

Reset the conversation thread to start a new topic.

**Parameters:** None

**Example:**

```
Tool: reset_thread()
Response: "Thread reset. Next question will start a new conversation."
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/mkusaka/hitlslack
cd hitlslack

# Install dependencies
pnpm install

# Build the project
pnpm run build
```

### Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Watch mode
pnpm run test:watch
```

### Local Development

```bash
# Run in development mode
pnpm run dev

# Build and run
pnpm run build
pnpm start

# Type checking
pnpm run typecheck

# Linting
pnpm run lint
```

## How It Works

1. **AI Asks Question**: The AI assistant calls the `ask_human` tool with a question
2. **Post to Slack**: The server posts the question to the configured Slack channel, mentioning the specified user
3. **Wait for Response**: The server listens for a response from the mentioned user in the thread
4. **Return Answer**: Once received, the human's response is returned to the AI assistant
5. **Timeout Handling**: If no response is received within the timeout period, an error is returned

## Troubleshooting

### Bot not responding

- Ensure the bot is invited to the channel
- Check that Socket Mode is enabled
- Verify the app-level token has `connections:write` scope

### Authentication errors

- Regenerate tokens if they've expired
- Ensure bot token starts with `xoxb-` and app token with `xapp-`

### Missing messages

- Check Event Subscriptions are enabled
- Verify `message.channels` event is subscribed
- Ensure the bot has required permissions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
