---
description: Bump project version (patch/minor/major)
---

Bump the project version using npm version command.

Arguments: $ARGUMENTS (should be one of: patch, minor, or major)

Steps:

1. Validate that the argument is one of: patch, minor, major
2. Ensure git working directory is clean (commit any pending changes first if needed)
3. Run `npm version $ARGUMENTS` to bump the version
4. Push the commit and tag to the repository

If no argument is provided, default to "patch".

Example usage:

- `/bump` - bumps patch version (0.0.1 -> 0.0.2)
- `/bump minor` - bumps minor version (0.0.1 -> 0.1.0)
- `/bump major` - bumps major version (0.0.1 -> 1.0.0)
