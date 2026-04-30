#!/usr/bin/env node

const hosts = [
  "https://auth.aveyo.com",
  "https://api.aveyo.com",
  "https://app.aveyo.com",
  "https://org.aveyo.com",
  "https://marketing.aveyo.com",
  "https://kpi.aveyo.com",
  "https://aveyo.com"
];

const requiredHeaders = [
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "content-security-policy-report-only"
];

function normalizeLocation(origin, locationHeader) {
  if (!locationHeader) return "";
  try {
    return new URL(locationHeader, origin).toString();
  } catch {
    return locationHeader;
  }
}

async function inspectHost(origin) {
  const response = await fetch(origin, {
    method: "HEAD",
    redirect: "manual"
  });

  const headerState = {};
  for (const header of requiredHeaders) {
    headerState[header] = response.headers.get(header) ?? "";
  }

  return {
    origin,
    status: response.status,
    location: normalizeLocation(origin, response.headers.get("location")),
    cors: response.headers.get("access-control-allow-origin") ?? "",
    cache: response.headers.get("cache-control") ?? "",
    headers: headerState
  };
}

const results = await Promise.all(
  hosts.map(async (host) => {
    try {
      return await inspectHost(host);
    } catch (error) {
      return {
        origin: host,
        status: 0,
        location: "",
        cors: "",
        cache: "",
        headers: Object.fromEntries(requiredHeaders.map((header) => [header, ""])),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  })
);

for (const result of results) {
  console.log(`\n# ${result.origin}`);
  if (result.error) {
    console.log(`error: ${result.error}`);
    continue;
  }

  console.log(`status: ${result.status}`);
  if (result.location) {
    console.log(`location: ${result.location}`);
  }
  console.log(`access-control-allow-origin: ${result.cors || "(missing)"}`);
  console.log(`cache-control: ${result.cache || "(missing)"}`);

  for (const header of requiredHeaders) {
    console.log(`${header}: ${result.headers[header] || "(missing)"}`);
  }
}
