#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

const requiredTemplateFiles = [
  "src/lib/auth/config.ts",
  "src/lib/auth/session.ts",
  "src/lib/auth/use-auth-session.ts",
  "src/app/login/page.tsx"
];

const requiredEnvKeys = ["NEXT_PUBLIC_AUTH_APP_URL", "NEXT_PUBLIC_PLATFORM_API_BASE_URL"];

const sourceSubdirectories = ["src/app", "src/components", "src/lib"];
const sourceFileRegex = /\.(ts|tsx|js|mjs)$/i;
const forbiddenAuthPatterns = [
  {
    name: "authorization-header",
    regex: /\bAuthorization\b/
  },
  {
    name: "bearer-token",
    regex: /\bBearer\b/
  }
];

function toRelativePath(absolutePath) {
  return path.relative(repoRoot, absolutePath) || ".";
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function detectAppRoot() {
  const candidates = [repoRoot];

  for (const candidate of candidates) {
    const checks = await Promise.all(
      requiredTemplateFiles.map((relativePath) => pathExists(path.join(candidate, relativePath)))
    );
    if (checks.every(Boolean)) {
      return candidate;
    }
  }

  throw new Error(
    [
      "Could not locate app root with required auth template files.",
      "Expected one of:",
      ...candidates.map((candidate) => `- ${toRelativePath(candidate)}`)
    ].join("\n")
  );
}

function collectLineMatches(content, matcher) {
  const lines = content.split("\n");
  const matches = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (matcher.test(lines[index])) {
      matches.push(index + 1);
    }
  }
  return matches;
}

async function collectSourceFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectSourceFiles(absolutePath);
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && sourceFileRegex.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function validateTemplateConformance() {
  const appRoot = await detectAppRoot();
  const findings = [];

  for (const relativeFilePath of requiredTemplateFiles) {
    const absoluteFilePath = path.join(appRoot, relativeFilePath);
    if (!(await pathExists(absoluteFilePath))) {
      findings.push(`Missing required auth template file: ${toRelativePath(absoluteFilePath)}`);
    }
  }

  const envExamplePath = path.join(appRoot, ".env.example");
  if (!(await pathExists(envExamplePath))) {
    findings.push(`Missing .env.example at ${toRelativePath(envExamplePath)}`);
  } else {
    const envExampleContent = await fs.readFile(envExamplePath, "utf8");
    for (const key of requiredEnvKeys) {
      if (!envExampleContent.includes(`${key}=`)) {
        findings.push(
          `.env.example missing required key ${key} at ${toRelativePath(envExamplePath)}`
        );
      }
    }
  }

  const sessionFilePath = path.join(appRoot, "src/lib/auth/session.ts");
  if (await pathExists(sessionFilePath)) {
    const sessionFile = await fs.readFile(sessionFilePath, "utf8");
    const requiredSessionPaths = ["/api/auth/session", "/api/auth/session/logout"];
    for (const sessionPath of requiredSessionPaths) {
      if (!sessionFile.includes(sessionPath)) {
        findings.push(
          `Missing required session path ${sessionPath} in ${toRelativePath(sessionFilePath)}`
        );
      }
    }
  }

  for (const subdirectory of sourceSubdirectories) {
    const absoluteSubdirectory = path.join(appRoot, subdirectory);
    if (!(await pathExists(absoluteSubdirectory))) {
      continue;
    }

    const sourceFiles = await collectSourceFiles(absoluteSubdirectory);
    for (const sourceFilePath of sourceFiles) {
      const content = await fs.readFile(sourceFilePath, "utf8");
      for (const pattern of forbiddenAuthPatterns) {
        const matchingLines = collectLineMatches(content, pattern.regex);
        for (const lineNumber of matchingLines) {
          findings.push(
            [
              `Forbidden token/header pattern "${pattern.name}"`,
              `in ${toRelativePath(sourceFilePath)}:${lineNumber}`,
              "(auth template requires cookie-only first-party API calls)"
            ].join(" ")
          );
        }
      }
    }
  }

  return {
    appRoot,
    findings
  };
}

try {
  const { appRoot, findings } = await validateTemplateConformance();
  if (findings.length > 0) {
    console.error("Auth template conformance check failed.");
    console.error(`Resolved app root: ${toRelativePath(appRoot)}`);
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log("Auth template conformance check passed.");
  console.log(`Resolved app root: ${toRelativePath(appRoot)}`);
} catch (error) {
  console.error("Auth template conformance check failed with an unexpected error.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
