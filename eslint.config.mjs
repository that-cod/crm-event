import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
    {
        ignores: [
            "**/node_modules/**",
            "**/.next/**",
            "**/out/**",
            "**/build/**",
            "**/.git/**",
        ],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "react": reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        rules: {
            // TypeScript rules
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],

            // React Hooks rules
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // Code quality rules (from CLAUDE.md)
            "max-lines-per-function": [
                "warn",
                {
                    max: 50,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
            "max-depth": ["error", 3],
            "complexity": ["warn", 10],
            "max-nested-callbacks": ["warn", 3],

            // Magic numbers detection
            "no-magic-numbers": [
                "warn",
                {
                    // Allow common, universally-understood numbers
                    ignore: [
                        -1, 0, 1, 2, 3, 4, 5, 6, 8, 9,  // Common counters and small indices
                        10, 12, 15, 16, 18, 20, 25,      // Decimal/hex bases, common increments, GST rates
                        24, 30, 31, 36,                  // Calendar (hours/day, days/month, string base)
                        50, 60, 100, 150,                // Common thresholds and time (seconds, minutes)
                        200, 255, 500, 503,              // HTTP codes, RGB max, common delays
                        999, 1000, 1024,                 // Milliseconds, file size conversions (KB)
                        3000, 5000,                      // Common timeout values (3s, 5s)
                        0.5, 1.5,                        // Common fractional values (half shifts, etc.)
                    ],
                    ignoreArrayIndexes: true,
                    ignoreDefaultValues: true,
                    enforceConst: true,
                },
            ],

            // General best practices
            "no-console": [
                "warn",
                {
                    allow: ["warn", "error"],
                },
            ],
            "no-debugger": "error",
            "prefer-const": "warn",
            "no-var": "error",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];
