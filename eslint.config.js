// @ts-check
import { defineConfig } from "eslint/config";
import "eslint-plugin-only-warn";
import js from "@eslint/js";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default defineConfig(
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
      parserOptions: {
        parser: ts.parser,
        project: `tsconfig.json`,
      },
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],
      "prefer-template": "warn",
      "object-shorthand": "warn",
    },
  },
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
  {
    ignores: ["dist", "build", "node_modules"],
  },
);
