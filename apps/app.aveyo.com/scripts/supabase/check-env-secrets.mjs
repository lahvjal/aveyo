#!/usr/bin/env node

const TARGET_ENV = (process.env.TARGET_ENV || "").toLowerCase();
const SERVICE = (process.env.SERVICE || "all").toLowerCase();
const ALLOW_PLACEHOLDERS = process.env.ALLOW_PLACEHOLDERS === "true";

const expectedRefs = {
  dev: "safebiayjffnkcmtshni",
  staging: "awzyvdeyzpblonbzddwa",
  prod: "semzdcsumfnmjnhzhtst"
};

const requiredByService = {
  api: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "OPENAI_API_KEY",
    "AVA_ALLOWED_ORIGINS",
    "AVA_SESSION_COOKIE_DOMAIN",
    "AVA_SESSION_COOKIE_SAMESITE",
    "AVA_SESSION_COOKIE_SECURE",
    "AVA_SESSION_COOKIE_HTTPONLY"
  ],
  "rep-web": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_PLATFORM_API_BASE_URL"
  ],
  "customer-widget": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_PLATFORM_API_BASE_URL",
    "NEXT_PUBLIC_AVA_DASHBOARD_PAGE_URL",
    "NEXT_PUBLIC_AVA_WIDGET_PAGE_URL"
  ],
  "org-chart": ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_APP_URL"],
  kpi: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ],
  "customer-portal": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ]
};

const selectedServices =
  SERVICE === "all"
    ? Object.keys(requiredByService)
    : SERVICE in requiredByService
      ? [SERVICE]
      : [];

if (selectedServices.length === 0) {
  console.error(`Unknown SERVICE value: ${SERVICE}`);
  process.exit(1);
}

const problems = [];

const envAliasGroups = {
  NEXT_PUBLIC_PLATFORM_API_BASE_URL: [
    "NEXT_PUBLIC_PLATFORM_API_BASE_URL",
    "NEXT_PUBLIC_AVA_API_BASE_URL"
  ]
};

function isPlaceholder(value) {
  return (
    value.includes("<") ||
    value.includes("your-") ||
    value.includes("example") ||
    value.includes("changeme")
  );
}

for (const serviceName of selectedServices) {
  for (const requiredEnvName of requiredByService[serviceName]) {
    const acceptableEnvNames = envAliasGroups[requiredEnvName] ?? [requiredEnvName];
    const resolvedEnvName = acceptableEnvNames.find((envName) => {
      const value = process.env[envName];
      return typeof value === "string" && value.trim().length > 0;
    });
    const value = resolvedEnvName ? process.env[resolvedEnvName] : undefined;
    if (!value || value.trim().length === 0) {
      if (acceptableEnvNames.length > 1) {
        problems.push(`[${serviceName}] Missing one of ${acceptableEnvNames.join(" or ")}`);
      } else {
        problems.push(`[${serviceName}] Missing ${requiredEnvName}`);
      }
      continue;
    }

    if (!ALLOW_PLACEHOLDERS && isPlaceholder(value)) {
      problems.push(`[${serviceName}] ${resolvedEnvName ?? requiredEnvName} appears to be a placeholder`);
    }
  }
}

if (TARGET_ENV) {
  if (!(TARGET_ENV in expectedRefs)) {
    problems.push(`Unknown TARGET_ENV value: ${TARGET_ENV}`);
  } else {
    const expectedRef = expectedRefs[TARGET_ENV];
    const prodRef = expectedRefs.prod;
    const supabaseUrlVars = ["NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL"];

    for (const varName of supabaseUrlVars) {
      const value = process.env[varName];
      if (!value) continue;

      if (!value.includes(expectedRef)) {
        problems.push(`${varName} does not include expected ${TARGET_ENV} ref (${expectedRef})`);
      }
      if (TARGET_ENV !== "prod" && value.includes(prodRef)) {
        problems.push(`${varName} references prod ref while TARGET_ENV=${TARGET_ENV}`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error("Environment validation failed:");
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log("Environment validation passed.");
