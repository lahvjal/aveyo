import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const WORKSPACE_ROOT_MARKERS = Object.freeze(["pnpm-workspace.yaml", "turbo.json", ".git"]);
const LOADED_ENV_CACHE = new Set();

function normalizeNodeEnv(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || "development";
}

function resolveDirectory(value) {
  const basePath = typeof value === "string" && value.trim() ? value.trim() : process.cwd();
  const absolutePath = path.resolve(basePath);

  try {
    if (fs.statSync(absolutePath).isDirectory()) {
      return absolutePath;
    }
  } catch {
    // Ignore missing path and fallback below.
  }

  return path.dirname(absolutePath);
}

function hasWorkspaceMarker(directory) {
  return WORKSPACE_ROOT_MARKERS.some((marker) => fs.existsSync(path.join(directory, marker)));
}

function findWorkspaceRoot(startDirectory) {
  let current = startDirectory;

  while (true) {
    if (hasWorkspaceMarker(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDirectory;
    }
    current = parent;
  }
}

export function resolveCentralEnvFiles(workspaceRoot, nodeEnv) {
  const envFileNames = [
    ".env",
    `.env.${nodeEnv}`,
    ...(nodeEnv === "test" ? [] : [".env.local"]),
    `.env.${nodeEnv}.local`
  ];

  return envFileNames
    .map((fileName) => path.join(workspaceRoot, fileName))
    .filter((candidate) => fs.existsSync(candidate));
}

function applyEnvFile(envFile, override) {
  let fileContents = "";
  try {
    fileContents = fs.readFileSync(envFile, "utf8");
  } catch {
    return;
  }

  let parsedValues = {};
  try {
    parsedValues = parseEnv(fileContents);
  } catch {
    return;
  }

  for (const [key, value] of Object.entries(parsedValues)) {
    if (override || typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

export function loadCentralEnv(options = {}) {
  const startDirectory = resolveDirectory(options.source);
  const workspaceRoot = options.workspaceRoot
    ? path.resolve(options.workspaceRoot)
    : findWorkspaceRoot(startDirectory);
  const nodeEnv = normalizeNodeEnv(options.nodeEnv ?? process.env.NODE_ENV);
  const override = options.override ?? true;
  const cacheKey = `${workspaceRoot}:${nodeEnv}`;

  if (LOADED_ENV_CACHE.has(cacheKey)) {
    return { workspaceRoot, nodeEnv, loadedFiles: [] };
  }

  const loadedFiles = resolveCentralEnvFiles(workspaceRoot, nodeEnv);
  for (const envFile of loadedFiles) {
    applyEnvFile(envFile, override);
  }

  LOADED_ENV_CACHE.add(cacheKey);
  return { workspaceRoot, nodeEnv, loadedFiles };
}
