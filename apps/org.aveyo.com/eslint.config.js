import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off"
    }
  },
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Legacy code relies on broad Supabase payload shapes; keep this unblocked
      // while we gradually tighten typing in targeted modules.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ],
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
      "import/no-anonymous-default-export": "off",
      // React Compiler safety rules are currently too strict for existing state
      // synchronization patterns used across admin/profile flows.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off"
    }
  },
  globalIgnores(["dist/**", "**/.next/**", "**/node_modules/**"])
]);
