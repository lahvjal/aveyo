#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "..");
const callbackConfigPath = path.join(repoRoot, "config", "auth-callbacks.json");

const targetEnv = (process.argv[2] || "").toLowerCase();
const command = (process.argv[3] || "--apply").toLowerCase();

if (!targetEnv || !["dev", "staging", "prod"].includes(targetEnv)) {
  console.error("Usage: node scripts/configure-auth-callbacks.mjs <dev|staging|prod> [--apply|--verify]");
  process.exit(1);
}

if (!["--apply", "--verify"].includes(command)) {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

if (!fs.existsSync(callbackConfigPath)) {
  console.error(`Missing callback config: ${callbackConfigPath}`);
  process.exit(1);
}

const callbackConfig = JSON.parse(fs.readFileSync(callbackConfigPath, "utf8"));
const envConfig = callbackConfig[targetEnv];

if (!envConfig) {
  console.error(`No callback configuration found for ${targetEnv}`);
  process.exit(1);
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (!accessToken) {
  console.error("SUPABASE_ACCESS_TOKEN is required to read/write auth config.");
  process.exit(1);
}

const projectRef = envConfig.projectRef;
const expectedSiteUrl = envConfig.siteUrl;
const expectedUriAllowList = envConfig.uriAllowList.join(",");
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

async function apiRequest(method, body) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${endpoint} failed: ${response.status} ${text}`);
  }

  return response.json();
}

function normalizeAllowList(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort();
}

function verifyConfig(actualConfig) {
  const errors = [];

  if (actualConfig.site_url !== expectedSiteUrl) {
    errors.push(`site_url mismatch: expected ${expectedSiteUrl}, got ${actualConfig.site_url}`);
  }

  const expectedList = [...envConfig.uriAllowList].sort();
  const actualList = normalizeAllowList(actualConfig.uri_allow_list);

  const missing = expectedList.filter((item) => !actualList.includes(item));
  if (missing.length > 0) {
    errors.push(`uri_allow_list missing expected entries: ${missing.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" | "));
  }
}

if (command === "--apply") {
  await apiRequest("PATCH", {
    site_url: expectedSiteUrl,
    uri_allow_list: expectedUriAllowList
  });
  console.log(`Auth callbacks updated for ${targetEnv} (${projectRef}).`);
}

const fetched = await apiRequest("GET");
verifyConfig(fetched);

console.log(`Auth callback verification passed for ${targetEnv}.`);
