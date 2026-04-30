#!/usr/bin/env node

/**
 * Replays the known privilege-escalation request path and expects denial.
 *
 * Required env vars:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - TARGET_PROFILE_ID
 */

import process from "node:process";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TARGET_PROFILE_ID = process.env.TARGET_PROFILE_ID;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TARGET_PROFILE_ID) {
  console.error("Missing required env vars. Set SUPABASE_URL, SUPABASE_ANON_KEY, TARGET_PROFILE_ID.");
  process.exit(1);
}

const restUrl = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/profiles?id=eq.${encodeURIComponent(TARGET_PROFILE_ID)}`;
const payload = { is_admin: true };

const response = await fetch(restUrl, {
  method: "PATCH",
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal"
  },
  body: JSON.stringify(payload)
});

const body = await response.text();
const denied = response.status === 401 || response.status === 403;

if (!denied) {
  console.error("Privilege escalation replay unexpectedly succeeded.");
  console.error(`Status: ${response.status}`);
  console.error(`Body: ${body}`);
  process.exit(1);
}

console.log("Privilege escalation replay denied as expected.");
console.log(`Status: ${response.status}`);
