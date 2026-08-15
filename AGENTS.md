# AI Agent Instructions and Rules

This file contains universal rules and guidelines for any AI agent (Claude, Cursor, Gemini, Copilot, etc.) assisting with this project. All AI agents must strictly follow these rules before reading, writing, or modifying any code.

## 1. Regression Prevention and Code Stability
- **Preserve Existing Logic**: When editing a file to add a new feature or fix a bug, you MUST thoroughly read and understand the existing code first. Ensure that your changes do not remove, bypass, or alter the logic of other working features in the same file.
- **Beware of Overwriting Fixes**: If a file contains a specific workaround or bug fix (e.g., handling edge cases, specific error parsing), you must preserve it when refactoring or replacing code blocks. Do not overwrite a file with an older version of the code that lacks recent fixes.
- **Check Dependencies**: Before modifying a function's signature or return type, check if other components in the project rely on it. Update all dependent code accordingly.
- **Test Before Moving On**: After making changes, always run the build compiler (e.g., `npm run build` or `tsc`) or relevant tests to verify that no syntax errors, type errors, or obvious regressions were introduced.
