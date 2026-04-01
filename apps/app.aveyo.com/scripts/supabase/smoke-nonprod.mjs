#!/usr/bin/env node

import { execSync } from "node:child_process";
import process from "node:process";

const targetEnv = (process.argv[2] || "").toLowerCase();
if (!["dev", "staging"].includes(targetEnv)) {
  console.error("Usage: node scripts/supabase/smoke-nonprod.mjs <dev|staging>");
  process.exit(1);
}

const refs = {
  dev: process.env.SUPABASE_PROJECT_REF_DEV || "safebiayjffnkcmtshni",
  staging: process.env.SUPABASE_PROJECT_REF_STAGING || "awzyvdeyzpblonbzddwa"
};

const projectRef = refs[targetEnv];
const supabaseUrl = `https://${projectRef}.supabase.co`;

function loadKeysFromCli(ref) {
  const output = execSync(`supabase projects api-keys --project-ref "${ref}" --output json`, {
    encoding: "utf8"
  });
  const parsed = JSON.parse(output);
  const anon = parsed.find((item) => item.id === "anon")?.api_key;
  const serviceRole = parsed.find((item) => item.id === "service_role")?.api_key;
  if (!anon || !serviceRole) {
    throw new Error("Could not resolve anon/service_role keys from Supabase CLI.");
  }
  return { anon, serviceRole };
}

const keysFromEnv = {
  anon: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
};

const keys =
  keysFromEnv.anon && keysFromEnv.serviceRole ? keysFromEnv : loadKeysFromCli(projectRef);

async function query(path, apiKey, extraHeaders = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders
    }
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

const problems = [];

const departmentsResponse = await query(
  "departments?select=id,name&name=in.(Sales,Customer%20Care,Operations,Finance)",
  keys.serviceRole
);
if (departmentsResponse.status !== 200 || !Array.isArray(departmentsResponse.body)) {
  problems.push(`departments seed query failed (status ${departmentsResponse.status})`);
} else if (departmentsResponse.body.length < 4) {
  problems.push(`expected 4 seeded departments, found ${departmentsResponse.body.length}`);
}

const kpiResponse = await query(
  "custom_kpis?select=kpi_id&kpi_id=eq.seed_pipeline_health",
  keys.serviceRole
);
if (kpiResponse.status !== 200 || !Array.isArray(kpiResponse.body) || kpiResponse.body.length < 1) {
  problems.push("seed KPI row missing in custom_kpis");
}

const avaSchemaResponse = await query("customer_profiles?select=id&limit=1", keys.serviceRole, {
  "Accept-Profile": "ava",
  "Content-Profile": "ava"
});
if (avaSchemaResponse.status !== 200 || !Array.isArray(avaSchemaResponse.body)) {
  problems.push(`ava schema query failed (status ${avaSchemaResponse.status})`);
}

const anonKpiResponse = await query(
  "custom_kpis?select=kpi_id&kpi_id=eq.seed_pipeline_health",
  keys.anon
);
if (anonKpiResponse.status === 200 && Array.isArray(anonKpiResponse.body) && anonKpiResponse.body.length > 0) {
  problems.push("anon unexpectedly read protected custom_kpis row");
}

if (problems.length > 0) {
  console.error(`Non-prod smoke checks failed for ${targetEnv}:`);
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(`Non-prod smoke checks passed for ${targetEnv}.`);
