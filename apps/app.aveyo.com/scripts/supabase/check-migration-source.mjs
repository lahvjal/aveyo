#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");
const canonicalDir = path.join(repoRoot, "supabase", "migrations");

const mirrorDirs = [
  path.resolve(repoRoot, "..", "org.aveyo.com", "supabase", "migrations"),
  path.resolve(repoRoot, "..", "kpi.aveyo.com", "supabase-migrations"),
  path.resolve(repoRoot, "..", "customer.aveyo.com", "supabase", "migrations")
];

function listSqlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trim();
}

if (!fs.existsSync(canonicalDir)) {
  console.error(`Canonical migration directory is missing: ${canonicalDir}`);
  process.exit(1);
}

const canonicalFiles = listSqlFiles(canonicalDir);
if (canonicalFiles.length === 0) {
  console.error("Canonical migration directory has no SQL files.");
  process.exit(1);
}

const canonicalMap = new Map(
  canonicalFiles.map((fileName) => [fileName, path.join(canonicalDir, fileName)])
);

const issues = [];

for (const mirrorDir of mirrorDirs) {
  if (!fs.existsSync(mirrorDir)) continue;
  const mirrorFiles = listSqlFiles(mirrorDir);

  for (const mirrorFile of mirrorFiles) {
    if (!canonicalMap.has(mirrorFile)) continue;

    const canonicalPath = canonicalMap.get(mirrorFile);
    const mirrorPath = path.join(mirrorDir, mirrorFile);

    const canonicalBody = readFile(canonicalPath);
    const mirrorBody = readFile(mirrorPath);
    if (canonicalBody !== mirrorBody) {
      issues.push(
        `Drift detected for ${mirrorFile}\n` +
          `  canonical: ${canonicalPath}\n` +
          `  mirror:    ${mirrorPath}`
      );
    }
  }
}

if (issues.length > 0) {
  const strictDrift = process.env.STRICT_MIGRATION_DRIFT === "true";
  const verbose = process.env.VERBOSE_MIGRATION_DRIFT === "true";
  const heading = strictDrift
    ? "Migration source drift detected:"
    : "Migration source drift detected (warning mode):";

  console.error(heading);
  const printableIssues = verbose ? issues : issues.slice(0, 10);
  for (const issue of printableIssues) {
    console.error(`- ${issue}`);
  }
  if (!verbose && issues.length > printableIssues.length) {
    console.error(
      `- ... ${issues.length - printableIssues.length} additional drift entries hidden. ` +
        "Set VERBOSE_MIGRATION_DRIFT=true to print all."
    );
  }

  if (strictDrift) {
    process.exit(1);
  }
}

console.log("Canonical migration source check passed.");
console.log(`Canonical directory: ${canonicalDir}`);
console.log(`Canonical file count: ${canonicalFiles.length}`);
