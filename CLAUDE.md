# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

hitls (Human-in-the-Loop Slack) is an MCP (Model Context Protocol) server that enables AI assistants to ask questions to humans via Slack and wait for their responses.

## Build and Development Commands

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm test                  # Run all tests
pnpm test:watch           # Run tests in watch mode
pnpm run test:coverage    # Run tests with coverage

# Linting and formatting
pnpm run lint             # Run oxlint
pnpm run typecheck        # Check TypeScript types
pnpm run format           # Format code with prettier

# Development
pnpm run dev              # Run in development mode with hot reload
pnpm run debug            # Run with tsx for debugging
```

## Architecture

### MCP Server Structure

The project implements an MCP server that exposes two tools:

- `ask_human`: Sends a question to a human via Slack and waits for their response
- `reset_thread`: Resets the conversation thread to start fresh

### Core Components

1. **MCP Server** (`src/index.ts`): Entry point that registers tools and handles MCP protocol communication

2. **Slack Integration** (`src/lib/slack-human-socket-client.ts`):
   - Uses Socket Mode for real-time bidirectional communication
   - Manages conversation threads to maintain context
   - Handles timeouts (default 5 minutes) for human responses
   - Tracks pending questions with Promise-based async handling

3. **Configuration** (`src/slack-config.ts`):
   - Validates environment variables using Zod schemas
   - Requires: SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_CHANNEL_ID, SLACK_USER_ID
   - Optional: RESPONSE_TIMEOUT_MS, LOG_LEVEL

### Key Patterns

1. **Async Message Flow**:
   - Questions are posted to Slack as thread messages
   - Socket Mode listener waits for replies from the specified user
   - Promises resolve when responses are received or timeout

2. **Error Handling**:
   - Comprehensive try-catch blocks with detailed logging
   - Graceful handling of Slack API failures
   - Timeout management for unresponsive scenarios

3. **Testing Strategy**:
   - All external dependencies (Slack APIs) are mocked
   - Uses vitest's fake timers for timeout testing
   - Tests cover happy paths, error cases, and edge conditions

## CI/CD Configuration

The project uses GitHub Actions with two workflows:

- `ci.yml`: Runs on every push - linting, type checking, tests, and build
- `release.yml`: Automated npm publishing on version tags

CI uses Node.js 22.x and pnpm 9.

## Claude Code Integration

### Custom Commands

- `/bump [patch|minor|major]`: Version bump command

### Hooks

Auto-formatting hook runs prettier after file modifications (Write/Edit/MultiEdit operations).
