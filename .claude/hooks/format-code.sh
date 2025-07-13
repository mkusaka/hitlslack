#!/bin/bash

# Format code with prettier after file modifications
# This hook runs after Write, Edit, or MultiEdit operations

# Get the current directory
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Run prettier on all files
cd "$DIR" && pnpm exec prettier --write . --log-level=error 2>/dev/null

# Exit successfully even if prettier fails (to not block the operation)
exit 0