# Claude Code Configuration

This directory contains Claude Code configurations for the hitls project.

## Structure

- `commands/` - Custom slash commands
  - `bump.md` - Version bump command (`/bump [patch|minor|major]`)
- `hooks/` - Automation hooks
  - `format-code.sh` - Runs prettier after file modifications
- `claude.json` - Hook configuration

## Hooks

### Auto-formatting Hook

The project is configured to automatically run `prettier --write` after any file modifications through Claude Code. This ensures consistent code formatting without manual intervention.

The hook triggers after:

- `Write` operations (creating new files)
- `Edit` operations (modifying existing files)
- `MultiEdit` operations (multiple edits in one file)

## Usage

These configurations work automatically when using Claude Code in this project directory. No additional setup is required.
