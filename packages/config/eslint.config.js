// Shared ESLint flat config. Each app/package extends this and layers
// framework-specific rules (e.g. eslint-config-next) on top.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    ignores: ["**/.next/**", "**/dist/**", "**/.turbo/**", "**/node_modules/**"],
  }
);
