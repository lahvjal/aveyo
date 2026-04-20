import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";

const DEFAULT_CONFIG_PATH = path.resolve("perf/ava-chat/config.example.json");
const REPORTS_DIRECTORY = path.resolve("perf/ava-chat/reports");
const DEFAULT_TIMEOUTS = {
  requestMs: 20_000,
  eventMs: 30_000,
  pollMs: 500
};

function parseArgs(argv) {
  const args = {
    config: DEFAULT_CONFIG_PATH,
    tier: "small",
    report: undefined,
    transport: undefined,
    baseline: undefined,
    gateConfig: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config" && argv[index + 1]) {
      args.config = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--tier" && argv[index + 1]) {
      args.tier = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--report" && argv[index + 1]) {
      args.report = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--transport" && argv[index + 1]) {
      args.transport = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--baseline" && argv[index + 1]) {
      args.baseline = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--gate-config" && argv[index + 1]) {
      args.gateConfig = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      return {
        ...args,
        help: true
      };
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:

  node perf/ava-chat/run.mjs [--config path] [--tier small|target|stretch] [--transport poll|sse] [--report path] [--baseline report.json] [--gate-config gate.json]

Environment:

  AVA_PERF_METRICS=1
  AVA_LOAD_TEST_MODE=1
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
`);
}

function ensure(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values, ratio) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return Number(sorted[index].toFixed(2));
}

function summarizeDurations(values) {
  if (values.length === 0) {
    return {
      count: 0,
      min: null,
      p50: null,
      p95: null,
      p99: null,
      max: null,
      average: null
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const sorted = [...values].sort((left, right) => left - right);
  return {
    count: values.length,
    min: Number(sorted[0].toFixed(2)),
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    average: Number((total / values.length).toFixed(2))
  };
}

function summarizeScenarioSamples(samples, metrics) {
  const successful = samples.filter((sample) => !sample.error);
  const failed = samples.filter((sample) => sample.error);
  const summary = {
    total: samples.length,
    succeeded: successful.length,
    failed: failed.length,
    metrics: {},
    failures: failed.slice(0, 10)
  };

  for (const metricName of metrics) {
    const values = successful
      .map((sample) => sample[metricName])
      .filter((value) => typeof value === "number" && Number.isFinite(value));
    summary.metrics[metricName] = summarizeDurations(values);
  }

  return summary;
}

function extractPerfHeaders(headers) {
  const headerValue = (name) => headers.get(name);
  return {
    name: headerValue("x-ava-perf-name"),
    totalMs: parseNumberHeader(headerValue("x-ava-perf-total-ms")),
    dbQueryCount: parseNumberHeader(headerValue("x-ava-perf-db-query-count")),
    dbTotalMs: parseNumberHeader(headerValue("x-ava-perf-db-total-ms")),
    openAiCount: parseNumberHeader(headerValue("x-ava-perf-openai-count")),
    openAiTotalMs: parseNumberHeader(headerValue("x-ava-perf-openai-total-ms")),
    openAiMaxInFlight: parseNumberHeader(headerValue("x-ava-perf-openai-max-in-flight")),
    errorName: headerValue("x-ava-perf-error-name")
  };
}

function parseNumberHeader(rawValue) {
  if (!rawValue) {
    return null;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

async function requestJson(baseUrl, pathName, options = {}) {
  const {
    method = "GET",
    body,
    cookie,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUTS.requestMs
  } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAtMs = performance.now();
  const requestHeaders = {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    "x-ava-perf-enabled": "1",
    ...headers
  };

  try {
    const response = await fetch(`${baseUrl}${pathName}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: requestHeaders,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    const totalMs = Number((performance.now() - startedAtMs).toFixed(2));
    const perf = extractPerfHeaders(response.headers);

    if (!response.ok) {
      const message =
        (payload && typeof payload === "object" && typeof payload.error === "string" && payload.error) ||
        `Request failed (${response.status}) for ${method} ${pathName}`;
      throw new Error(message);
    }

    return {
      payload,
      totalMs,
      perf
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function createApiClient({ baseUrl, cookie, timeoutMs }) {
  return {
    request(pathName, options = {}) {
      return requestJson(baseUrl, pathName, {
        ...options,
        cookie,
        timeoutMs
      });
    },
    getSession() {
      return this.request("/api/auth/session", { method: "GET" });
    },
    listConversations() {
      return this.request("/api/conversations?excludeImpersonation=1&ownOnly=1", { method: "GET" });
    },
    createConversation(body = {}) {
      return this.request("/api/conversations", {
        method: "POST",
        body
      });
    },
    getConversation(conversationId) {
      return this.request(`/api/conversations/${conversationId}`, { method: "GET" });
    },
    createCustomerMessage(body) {
      return this.request("/api/messages", {
        method: "POST",
        body: {
          conversationId: body.conversationId,
          kind: "customer",
          text: body.text,
          clientMessageId: body.clientMessageId
        }
      });
    },
    createRepresentativeMessage(body) {
      return this.request("/api/messages", {
        method: "POST",
        body: {
          conversationId: body.conversationId,
          kind: "representative",
          text: body.text,
          representativeId: body.representativeId,
          clientMessageId: body.clientMessageId
        }
      });
    },
    requestHandoff(body) {
      return this.request("/api/handoff/request", {
        method: "POST",
        body
      });
    },
    listQueue() {
      return this.request("/api/handoff/queue", { method: "GET" });
    },
    claimHandoff(body) {
      return this.request("/api/handoff/claim", {
        method: "POST",
        body
      });
    },
    resolveHandoff(body) {
      return this.request("/api/handoff/resolve", {
        method: "POST",
        body
      });
    },
    submitHandoffRating(body) {
      return this.request("/api/handoff/rating", {
        method: "POST",
        body
      });
    },
    getManagerHandoffs() {
      return this.request("/api/manager/handoffs", { method: "GET" });
    },
    getRealtimeEvents(afterEventId) {
      const query = afterEventId ? `?afterEventId=${encodeURIComponent(afterEventId)}` : "";
      return this.request(`/api/realtime/events${query}`, { method: "GET" });
    },
    listPerfSnapshots(params = {}) {
      const query = new URLSearchParams();
      if (params.name) {
        query.set("name", params.name);
      }
      if (params.since) {
        query.set("since", params.since);
      }
      if (params.limit) {
        query.set("limit", String(params.limit));
      }
      return this.request(`/api/perf/snapshots${query.size > 0 ? `?${query.toString()}` : ""}`, {
        method: "GET"
      });
    },
    clearPerfSnapshots() {
      return this.request("/api/perf/snapshots", { method: "DELETE" });
    }
  };
}

async function runPool(count, concurrency, worker) {
  const results = new Array(count);
  let nextIndex = 0;

  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, count || 1)) }, async () => {
    while (nextIndex < count) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        results[currentIndex] = await worker(currentIndex);
      } catch (error) {
        results[currentIndex] = {
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
  });

  await Promise.all(runners);
  return results;
}

function buildCookie(accessToken, refreshToken) {
  return `ava-access-token=${encodeURIComponent(accessToken)}; ava-refresh-token=${encodeURIComponent(refreshToken)}`;
}

function createRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-").toLowerCase();
}

function createClientMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function latestMessageByKind(messages, kind) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.kind === kind) {
      return message;
    }
  }
  return null;
}

async function waitForConversationAvaReply(client, conversationId, previousAvaMessageId, timeouts) {
  const startedAtMs = performance.now();
  const deadline = startedAtMs + timeouts.eventMs;

  while (performance.now() < deadline) {
    const response = await client.getConversation(conversationId);
    const conversation = response.payload?.conversation;
    const nextAvaMessage = latestMessageByKind(conversation?.messages ?? [], "ava");
    if (nextAvaMessage && nextAvaMessage.id !== previousAvaMessageId) {
      return {
        visibleMs: Number((performance.now() - startedAtMs).toFixed(2)),
        conversation,
        perf: response.perf
      };
    }
    await sleep(timeouts.pollMs);
  }

  throw new Error(`Timed out waiting for Ava reply on conversation ${conversationId}.`);
}

async function waitForQueueRecord(agentClient, conversationId, statuses, timeouts) {
  const startedAtMs = performance.now();
  const deadline = startedAtMs + timeouts.eventMs;

  while (performance.now() < deadline) {
    const response = await agentClient.listQueue();
    const queue = response.payload?.queue ?? [];
    const queueRecord = queue.find(
      (record) => record.conversationId === conversationId && statuses.includes(record.status)
    );
    if (queueRecord) {
      return {
        queueRecord,
        visibleMs: Number((performance.now() - startedAtMs).toFixed(2)),
        perf: response.perf
      };
    }
    await sleep(timeouts.pollMs);
  }

  throw new Error(`Timed out waiting for queue record on conversation ${conversationId}.`);
}

async function waitForManagerHandoff(managerClient, conversationId, statuses, timeouts) {
  const startedAtMs = performance.now();
  const deadline = startedAtMs + timeouts.eventMs;

  while (performance.now() < deadline) {
    const response = await managerClient.getManagerHandoffs();
    const handoffs = response.payload?.handoffs ?? [];
    const handoff = handoffs.find(
      (record) => record.conversationId === conversationId && statuses.includes(record.status)
    );
    if (handoff) {
      return {
        handoff,
        visibleMs: Number((performance.now() - startedAtMs).toFixed(2)),
        perf: response.perf
      };
    }
    await sleep(timeouts.pollMs);
  }

  throw new Error(`Timed out waiting for manager handoff on conversation ${conversationId}.`);
}

async function waitForRealtimeEvent(observerClient, conversationId, afterEventId, timeouts) {
  const startedAtMs = performance.now();
  const deadline = startedAtMs + timeouts.eventMs;
  let cursor = afterEventId;

  while (performance.now() < deadline) {
    const response = await observerClient.getRealtimeEvents(cursor);
    const payload = response.payload;
    if (payload?.cursor) {
      cursor = payload.cursor;
    }
    const matchedEvent = (payload?.events ?? []).find((event) => event.conversationId === conversationId);
    if (matchedEvent) {
      return {
        event: matchedEvent,
        visibleMs: Number((performance.now() - startedAtMs).toFixed(2)),
        perf: response.perf
      };
    }
    await sleep(timeouts.pollMs);
  }

  throw new Error(`Timed out waiting for realtime event on conversation ${conversationId}.`);
}

function parseSseFrames(buffer) {
  const frames = [];
  let remaining = buffer.replace(/\r\n/g, "\n");

  while (true) {
    const delimiterIndex = remaining.indexOf("\n\n");
    if (delimiterIndex < 0) {
      break;
    }

    const rawFrame = remaining.slice(0, delimiterIndex);
    remaining = remaining.slice(delimiterIndex + 2);

    const event = {
      name: "message",
      data: ""
    };

    for (const line of rawFrame.split("\n")) {
      if (line.startsWith("event:")) {
        event.name = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        const value = line.slice("data:".length).trim();
        event.data = event.data ? `${event.data}\n${value}` : value;
      }
    }

    frames.push(event);
  }

  return {
    frames,
    remaining
  };
}

async function waitForSseInvalidation({ baseUrl, cookie, conversationId, timeouts }) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeouts.eventMs);
  const startedAtMs = performance.now();

  try {
    const streamUrl = new URL("/api/realtime/stream", baseUrl);
    streamUrl.searchParams.set("conversationId", conversationId);

    const response = await fetch(streamUrl.toString(), {
      method: "GET",
      headers: {
        Cookie: cookie,
        Accept: "text/event-stream",
        "x-ava-perf-enabled": "1"
      },
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      throw new Error(`Unable to open SSE stream (${response.status}).`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseFrames(buffer);
        buffer = parsed.remaining;

        for (const frame of parsed.frames) {
          if (process.env.AVA_PERF_DEBUG_SSE === "1") {
            console.log("SSE frame", frame.name, frame.data);
          }
          if (frame.name !== "invalidate" || !frame.data) {
            continue;
          }

          const payload = JSON.parse(frame.data);
          if (!payload || payload.conversationId !== conversationId) {
            continue;
          }

          await reader.cancel().catch(() => null);
          return {
            event: payload,
            visibleMs: Number((performance.now() - startedAtMs).toFixed(2))
          };
        }
      }
    } catch (error) {
      if (timedOut) {
        throw new Error(`Timed out waiting for SSE invalidation on conversation ${conversationId}.`);
      }
      throw error;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  throw new Error(`Timed out waiting for SSE invalidation on conversation ${conversationId}.`);
}

async function ensureConversation(customerClient) {
  const listResponse = await customerClient.listConversations();
  const conversations = listResponse.payload?.conversations ?? [];
  const existingConversation = conversations[0];
  if (existingConversation) {
    return {
      conversation: existingConversation,
      perf: listResponse.perf
    };
  }

  const createResponse = await customerClient.createConversation({
    subject: "Performance harness conversation"
  });
  return {
    conversation: createResponse.payload?.conversation,
    perf: createResponse.perf
  };
}

async function runMessageRoundtrip({
  customerClient,
  observerClient,
  observerCookie,
  baseUrl,
  transport,
  timeouts
}) {
  const ensureResponse = await ensureConversation(customerClient);
  const conversation = ensureResponse.conversation;
  const beforeConversationResponse = await customerClient.getConversation(conversation.id);
  const beforeConversation = beforeConversationResponse.payload?.conversation;
  const previousAvaMessage = latestMessageByKind(beforeConversation?.messages ?? [], "ava");
  const realtimeCursor =
    transport === "poll" && observerClient
      ? (await observerClient.getRealtimeEvents()).payload?.cursor
      : undefined;
  const sseWaitPromise =
    transport === "sse" && observerCookie
      ? waitForSseInvalidation({
          baseUrl,
          cookie: observerCookie,
          conversationId: conversation.id,
          timeouts
        })
      : null;

  const sendResponse = await customerClient.createCustomerMessage({
    conversationId: conversation.id,
    text: "Performance harness: I need help with my installation timeline.",
    clientMessageId: createClientMessageId("perf-customer")
  });

  const eventResponse =
    transport === "sse"
      ? await sseWaitPromise
      : observerClient
        ? await waitForRealtimeEvent(observerClient, conversation.id, realtimeCursor, timeouts)
        : null;
  const avaReplyResponse = await waitForConversationAvaReply(
    customerClient,
    conversation.id,
    previousAvaMessage?.id ?? null,
    timeouts
  );

  return {
    conversationId: conversation.id,
    createConversationPerfMs: ensureResponse.perf?.totalMs ?? null,
    fetchConversationPerfMs: beforeConversationResponse.perf?.totalMs ?? null,
    sendRequestMs: sendResponse.totalMs,
    sendServerMs: sendResponse.perf?.totalMs ?? null,
    sendDbQueryCount: sendResponse.perf?.dbQueryCount ?? null,
    eventVisibleMs: eventResponse?.visibleMs ?? null,
    eventServerMs: eventResponse?.perf?.totalMs ?? null,
    eventDbQueryCount: eventResponse?.perf?.dbQueryCount ?? null,
    avaReplyVisibleMs: avaReplyResponse.visibleMs,
    replyConversationPerfMs: avaReplyResponse.perf?.totalMs ?? null,
    replyConversationDbQueryCount: avaReplyResponse.perf?.dbQueryCount ?? null
  };
}

async function runHandoffRoundtrip({
  customerClient,
  agentClient,
  managerClient,
  agentIdentity,
  timeouts
}) {
  const ensureResponse = await ensureConversation(customerClient);
  const conversation = ensureResponse.conversation;

  const requestResponse = await customerClient.requestHandoff({
    conversationId: conversation.id,
    customerName: "Perf Harness Customer",
    reason: "Need a human to review my account."
  });

  const queueResponse = await waitForQueueRecord(agentClient, conversation.id, ["pending"], timeouts);
  const managerResponse = await waitForManagerHandoff(managerClient, conversation.id, ["pending"], timeouts);

  const claimResponse = await agentClient.claimHandoff({
    requestId: queueResponse.queueRecord.requestId,
    representative: {
      id: agentIdentity.user.id,
      name: agentIdentity.user.name,
      avatarUrl: agentIdentity.user.avatarUrl ?? undefined
    }
  });

  const repMessageResponse = await agentClient.createRepresentativeMessage({
    conversationId: conversation.id,
    text: "Performance harness: I am taking over this handoff now.",
    representativeId: agentIdentity.user.id,
    clientMessageId: createClientMessageId("perf-agent")
  });

  const resolveResponse = await agentClient.resolveHandoff({
    conversationId: conversation.id,
    resolutionNote: "Performance harness resolved handoff."
  });

  const ratingResponse = await customerClient.submitHandoffRating({
    conversationId: conversation.id,
    rating: "thumbs_up"
  });

  const ratedConversation = ratingResponse.payload?.thread ?? ratingResponse.payload?.conversation;
  const previousAvaMessage = latestMessageByKind(ratedConversation?.messages ?? [], "ava");

  const followUpResponse = await customerClient.createCustomerMessage({
    conversationId: conversation.id,
    text: "Yes, I still need help with my next project step.",
    clientMessageId: createClientMessageId("perf-customer-followup")
  });

  const returnToAiResponse = await waitForConversationAvaReply(
    customerClient,
    conversation.id,
    previousAvaMessage?.id ?? null,
    timeouts
  );

  return {
    conversationId: conversation.id,
    handoffRequestMs: requestResponse.totalMs,
    handoffRequestDbQueryCount: requestResponse.perf?.dbQueryCount ?? null,
    queueVisibleMs: queueResponse.visibleMs,
    queueDbQueryCount: queueResponse.perf?.dbQueryCount ?? null,
    managerVisibleMs: managerResponse.visibleMs,
    managerDbQueryCount: managerResponse.perf?.dbQueryCount ?? null,
    claimMs: claimResponse.totalMs,
    claimDbQueryCount: claimResponse.perf?.dbQueryCount ?? null,
    repMessageMs: repMessageResponse.totalMs,
    resolveMs: resolveResponse.totalMs,
    resolveDbQueryCount: resolveResponse.perf?.dbQueryCount ?? null,
    ratingMs: ratingResponse.totalMs,
    followUpMessageMs: followUpResponse.totalMs,
    returnToAiMs: returnToAiResponse.visibleMs
  };
}

async function runRefreshRound(client, mode) {
  if (mode === "manager") {
    const response = await client.getManagerHandoffs();
    return {
      requestMs: response.totalMs,
      serverMs: response.perf?.totalMs ?? null,
      dbQueryCount: response.perf?.dbQueryCount ?? null
    };
  }

  const queueResponse = await client.listQueue();
  const realtimeResponse = await client.getRealtimeEvents();
  return {
    queueRequestMs: queueResponse.totalMs,
    queueServerMs: queueResponse.perf?.totalMs ?? null,
    queueDbQueryCount: queueResponse.perf?.dbQueryCount ?? null,
    realtimeRequestMs: realtimeResponse.totalMs,
    realtimeServerMs: realtimeResponse.perf?.totalMs ?? null,
    realtimeDbQueryCount: realtimeResponse.perf?.dbQueryCount ?? null
  };
}

function groupPerfSnapshots(snapshots) {
  const grouped = new Map();

  for (const snapshot of snapshots) {
    const list = grouped.get(snapshot.name) ?? [];
    list.push(snapshot);
    grouped.set(snapshot.name, list);
  }

  return Object.fromEntries(
    Array.from(grouped.entries()).map(([name, group]) => [
      name,
      {
        count: group.length,
        totalMs: summarizeDurations(group.map((snapshot) => snapshot.totalMs)),
        dbQueryCount: summarizeDurations(
          group
            .map((snapshot) => snapshot.dbQueryCount)
            .filter((value) => typeof value === "number" && Number.isFinite(value))
        ),
        dbTotalMs: summarizeDurations(
          group
            .map((snapshot) => snapshot.dbTotalMs)
            .filter((value) => typeof value === "number" && Number.isFinite(value))
        ),
        openAiTotalMs: summarizeDurations(
          group
            .map((snapshot) => snapshot.openAiTotalMs)
            .filter((value) => typeof value === "number" && Number.isFinite(value))
        ),
        openAiMaxInFlight: summarizeDurations(
          group
            .map((snapshot) => snapshot.openAiMaxInFlight)
            .filter((value) => typeof value === "number" && Number.isFinite(value))
        ),
        errors: group
          .filter((snapshot) => snapshot.errorName)
          .map((snapshot) => ({
            errorName: snapshot.errorName,
            errorMessage: snapshot.errorMessage
          }))
          .slice(0, 10)
      }
    ])
  );
}

async function loadConfig(configPath) {
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

async function provisionUser({
  supabaseUrl,
  anonKey,
  serviceRoleKey,
  runId,
  kind,
  index,
  emailDomain,
  password
}) {
  const email = `${runId}-${kind}-${index}@${emailDomain}`;
  const userLabel = `${kind}-${index + 1}`;
  const fullName = `Perf ${kind} ${index + 1}`;
  const role = kind === "customer" ? "customer" : "support_agent";
  const accountType = kind === "customer" ? "customer" : "employee";

  const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role,
        app_role: role
      },
      user_metadata: {
        role,
        account_type: accountType,
        full_name: fullName,
        job_title: kind === "manager" ? "Manager" : "Support Agent"
      }
    })
  });
  const createPayload = await createResponse.json().catch(() => null);
  if (!createResponse.ok) {
    throw new Error(
      createPayload?.msg ||
        createPayload?.message ||
        `Unable to create ${kind} user ${email} (${createResponse.status}).`
    );
  }

  const userId = ensure(createPayload?.id ?? createPayload?.user?.id, "Provisioned user id missing.");

  if (kind !== "customer") {
    const today = new Date().toISOString().slice(0, 10);
    const profileBody = {
      id: userId,
      email,
      full_name: fullName,
      job_title: kind === "manager" ? "Manager" : "Support Agent",
      start_date: today,
      is_admin: kind === "manager",
      is_manager: kind === "manager",
      is_customer_support_agent: true,
      employment_status: "active"
    };
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(profileBody)
    });
    if (!profileResponse.ok) {
      const profilePayload = await profileResponse.text();
      throw new Error(`Unable to upsert ${kind} profile for ${email}: ${profilePayload}`);
    }
  }

  const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });
  const signInPayload = await signInResponse.json().catch(() => null);
  if (!signInResponse.ok) {
    throw new Error(
      signInPayload?.msg ||
        signInPayload?.message ||
        `Unable to sign in ${kind} user ${email} (${signInResponse.status}).`
    );
  }

  const accessToken = ensure(signInPayload?.access_token, "Missing Supabase access token.");
  const refreshToken = ensure(signInPayload?.refresh_token, "Missing Supabase refresh token.");

  return {
    email,
    label: userLabel,
    kind,
    userId,
    cookie: buildCookie(accessToken, refreshToken)
  };
}

async function deleteProvisionedUser({ supabaseUrl, serviceRoleKey, userId }) {
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  }).catch(() => null);
}

async function createProvisionedClients(config, tier, runId) {
  const supabaseUrl = ensure(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL is required for auto provisioning."
  );
  const anonKey = ensure(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for auto provisioning."
  );
  const serviceRoleKey = ensure(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY is required for auto provisioning."
  );
  const emailDomain = config.autoProvision.emailDomain ?? "perf.aveyo.local";
  const password = ensure(
    config.autoProvision.password,
    "autoProvision.password is required when auto provisioning is enabled."
  );

  const customersToCreate = Math.max(1, tier.customers);
  const agentsToCreate = Math.max(1, Math.min(tier.agents, 3));
  const managersToCreate = Math.max(1, Math.min(tier.managers, 2));

  const createdUsers = [];
  const customers = [];
  const agents = [];
  const managers = [];

  for (let index = 0; index < customersToCreate; index += 1) {
    const provisioned = await provisionUser({
      supabaseUrl,
      anonKey,
      serviceRoleKey,
      runId,
      kind: "customer",
      index,
      emailDomain,
      password
    });
    createdUsers.push(provisioned);
    customers.push(provisioned);
  }

  for (let index = 0; index < agentsToCreate; index += 1) {
    const provisioned = await provisionUser({
      supabaseUrl,
      anonKey,
      serviceRoleKey,
      runId,
      kind: "agent",
      index,
      emailDomain,
      password
    });
    createdUsers.push(provisioned);
    agents.push(provisioned);
  }

  for (let index = 0; index < managersToCreate; index += 1) {
    const provisioned = await provisionUser({
      supabaseUrl,
      anonKey,
      serviceRoleKey,
      runId,
      kind: "manager",
      index,
      emailDomain,
      password
    });
    createdUsers.push(provisioned);
    managers.push(provisioned);
  }

  return {
    createdUsers,
    users: {
      customers,
      agents,
      managers
    },
    cleanup: async () => {
      if (!config.autoProvision.cleanupUsers) {
        return;
      }
      await Promise.all(
        createdUsers.map((user) =>
          deleteProvisionedUser({
            supabaseUrl,
            serviceRoleKey,
            userId: user.userId
          })
        )
      );
    }
  };
}

async function buildHarnessUsers(config, tier, runId) {
  if (config.autoProvision?.enabled) {
    return createProvisionedClients(config, tier, runId);
  }

  const manualUsers = config.users ?? {};
  return {
    users: {
      customers: manualUsers.customers ?? [],
      agents: manualUsers.agents ?? [],
      managers: manualUsers.managers ?? []
    },
    cleanup: async () => {}
  };
}

async function hydrateUserSessions(users, apiBaseUrl, timeouts) {
  const clientRecords = [];
  for (const user of users) {
    const client = createApiClient({
      baseUrl: apiBaseUrl,
      cookie: user.cookie,
      timeoutMs: timeouts.requestMs
    });
    const sessionResponse = await client.getSession();
    clientRecords.push({
      ...user,
      client,
      session: sessionResponse.payload
    });
  }
  return clientRecords;
}

function cyclePick(items, index) {
  return items[index % items.length];
}

async function writeReport(reportPath, report) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function createRegressionRule(label, pathSegments, options = {}) {
  return {
    label,
    path: pathSegments,
    maxValue: options.maxValue ?? null,
    maxDelta: options.maxDelta ?? null,
    maxPercentDelta: options.maxPercentDelta ?? null,
    allowMissing: options.allowMissing ?? false
  };
}

function createDefaultRegressionRules() {
  return [
    createRegressionRule("Message roundtrip failures remain at zero", [
      "scenarios",
      "messageRoundtrip",
      "summary",
      "failed"
    ], { maxValue: 0 }),
    createRegressionRule("Handoff roundtrip failures remain at zero", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "failed"
    ], { maxValue: 0 }),
    createRegressionRule("Manager refresh failures remain at zero", [
      "scenarios",
      "managerRefresh",
      "summary",
      "failed"
    ], { maxValue: 0 }),
    createRegressionRule("Agent refresh failures remain at zero", [
      "scenarios",
      "agentRefresh",
      "summary",
      "failed"
    ], { maxValue: 0 }),
    createRegressionRule("Customer send p95 stays within budget", [
      "scenarios",
      "messageRoundtrip",
      "summary",
      "metrics",
      "sendRequestMs",
      "p95"
    ], { maxDelta: 1500, maxPercentDelta: 35 }),
    createRegressionRule("Customer send p99 stays within budget", [
      "scenarios",
      "messageRoundtrip",
      "summary",
      "metrics",
      "sendRequestMs",
      "p99"
    ], { maxDelta: 2000, maxPercentDelta: 45 }),
    createRegressionRule("Realtime event visibility p95 stays within budget", [
      "scenarios",
      "messageRoundtrip",
      "summary",
      "metrics",
      "eventVisibleMs",
      "p95"
    ], { maxDelta: 1500, maxPercentDelta: 35 }),
    createRegressionRule("Ava reply visibility p95 stays within budget", [
      "scenarios",
      "messageRoundtrip",
      "summary",
      "metrics",
      "avaReplyVisibleMs",
      "p95"
    ], { maxDelta: 600, maxPercentDelta: 35 }),
    createRegressionRule("Handoff request p95 stays within budget", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "metrics",
      "handoffRequestMs",
      "p95"
    ], { maxDelta: 1500, maxPercentDelta: 35 }),
    createRegressionRule("Queue visibility p95 stays within budget", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "metrics",
      "queueVisibleMs",
      "p95"
    ], { maxDelta: 1000, maxPercentDelta: 35 }),
    createRegressionRule("Manager visibility p95 stays within budget", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "metrics",
      "managerVisibleMs",
      "p95"
    ], { maxDelta: 1200, maxPercentDelta: 35 }),
    createRegressionRule("Claim p95 stays within budget", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "metrics",
      "claimMs",
      "p95"
    ], { maxDelta: 1500, maxPercentDelta: 35 }),
    createRegressionRule("Resolve p95 stays within budget", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "metrics",
      "resolveMs",
      "p95"
    ], { maxDelta: 1500, maxPercentDelta: 35 }),
    createRegressionRule("Return-to-AI p95 stays within budget", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "metrics",
      "returnToAiMs",
      "p95"
    ], { maxDelta: 1800, maxPercentDelta: 35 }),
    createRegressionRule("Manager refresh p95 stays within budget", [
      "scenarios",
      "managerRefresh",
      "summary",
      "metrics",
      "requestMs",
      "p95"
    ], { maxDelta: 600, maxPercentDelta: 30 }),
    createRegressionRule("Agent queue refresh p95 stays within budget", [
      "scenarios",
      "agentRefresh",
      "summary",
      "metrics",
      "queueRequestMs",
      "p95"
    ], { maxDelta: 1200, maxPercentDelta: 35 }),
    createRegressionRule("Agent realtime refresh p95 stays within budget", [
      "scenarios",
      "agentRefresh",
      "summary",
      "metrics",
      "realtimeRequestMs",
      "p95"
    ], { maxDelta: 2500, maxPercentDelta: 35 }),
    createRegressionRule("Queue query-count p95 stays near baseline", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "metrics",
      "queueDbQueryCount",
      "p95"
    ], { maxDelta: 2, maxPercentDelta: 25, allowMissing: true }),
    createRegressionRule("Manager handoffs query-count p95 stays near baseline", [
      "scenarios",
      "handoffRoundtrip",
      "summary",
      "metrics",
      "managerDbQueryCount",
      "p95"
    ], { maxDelta: 2, maxPercentDelta: 25, allowMissing: true }),
    createRegressionRule("Message create query-count p95 stays near baseline", [
      "scenarios",
      "messageRoundtrip",
      "summary",
      "metrics",
      "sendDbQueryCount",
      "p95"
    ], { maxDelta: 2, maxPercentDelta: 25, allowMissing: true })
  ];
}

function getValueAtPath(value, pathSegments) {
  let current = value;
  for (const segment of pathSegments) {
    if (current === null || current === undefined || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function normalizeRegressionRules(rules) {
  if (!Array.isArray(rules)) {
    throw new Error("Regression gate rules must be an array.");
  }

  return rules.map((rule, index) => {
    if (!rule || typeof rule !== "object") {
      throw new Error(`Regression rule at index ${index} must be an object.`);
    }

    if (!Array.isArray(rule.path) || rule.path.length === 0) {
      throw new Error(`Regression rule at index ${index} requires a non-empty path array.`);
    }

    return {
      label:
        typeof rule.label === "string" && rule.label.trim()
          ? rule.label.trim()
          : `Regression rule ${index + 1}`,
      path: rule.path.map((segment) => String(segment)),
      maxValue:
        typeof rule.maxValue === "number" && Number.isFinite(rule.maxValue) ? rule.maxValue : null,
      maxDelta:
        typeof rule.maxDelta === "number" && Number.isFinite(rule.maxDelta) ? rule.maxDelta : null,
      maxPercentDelta:
        typeof rule.maxPercentDelta === "number" && Number.isFinite(rule.maxPercentDelta)
          ? rule.maxPercentDelta
          : null,
      allowMissing: rule.allowMissing === true
    };
  });
}

async function loadRegressionGateConfig(gateConfigPath) {
  if (!gateConfigPath) {
    return null;
  }

  const raw = await readFile(gateConfigPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Regression gate config must be a JSON object.");
  }

  return {
    baselineReport:
      typeof parsed.baselineReport === "string" && parsed.baselineReport.trim()
        ? path.resolve(path.dirname(gateConfigPath), parsed.baselineReport)
        : undefined,
    rules: normalizeRegressionRules(parsed.rules ?? [])
  };
}

function evaluateRegressionGate(currentReport, baselineReport, options) {
  const checks = options.rules.map((rule) => {
    const currentValue = getValueAtPath(currentReport, rule.path);
    const baselineValue = getValueAtPath(baselineReport, rule.path);
    const missingCurrent = typeof currentValue !== "number" || !Number.isFinite(currentValue);
    const missingBaseline = typeof baselineValue !== "number" || !Number.isFinite(baselineValue);

    if (missingCurrent || missingBaseline) {
      return {
        label: rule.label,
        path: rule.path,
        status: rule.allowMissing ? "skipped" : "failed",
        currentValue: missingCurrent ? null : currentValue,
        baselineValue: missingBaseline ? null : baselineValue,
        delta: null,
        percentDelta: null,
        reason: missingCurrent
          ? "Current report is missing this metric."
          : "Baseline report is missing this metric."
      };
    }

    const delta = Number((currentValue - baselineValue).toFixed(2));
    const percentDelta =
      baselineValue === 0 ? null : Number((((currentValue - baselineValue) / baselineValue) * 100).toFixed(2));
    const failures = [];

    if (rule.maxValue !== null && currentValue > rule.maxValue) {
      failures.push(`current ${currentValue} exceeds max ${rule.maxValue}`);
    }
    if (rule.maxDelta !== null && delta > rule.maxDelta) {
      failures.push(`delta ${delta} exceeds max delta ${rule.maxDelta}`);
    }
    if (
      rule.maxPercentDelta !== null &&
      percentDelta !== null &&
      percentDelta > rule.maxPercentDelta
    ) {
      failures.push(`delta ${percentDelta}% exceeds max delta ${rule.maxPercentDelta}%`);
    }

    return {
      label: rule.label,
      path: rule.path,
      status: failures.length > 0 ? "failed" : "passed",
      currentValue,
      baselineValue,
      delta,
      percentDelta,
      reason: failures.join("; ")
    };
  });

  const failed = checks.filter((check) => check.status === "failed");
  const skipped = checks.filter((check) => check.status === "skipped");

  return {
    baselineReport: options.baselineReportPath,
    baselineCreatedAt: baselineReport.createdAt ?? null,
    passed: failed.length === 0,
    failedCount: failed.length,
    skippedCount: skipped.length,
    checks
  };
}

function printRegressionGateSummary(regressionGate) {
  console.log(
    `Regression gate ${regressionGate.passed ? "passed" : "failed"} against ${regressionGate.baselineReport}`
  );

  if (regressionGate.failedCount > 0) {
    console.log("Failed checks:");
    regressionGate.checks
      .filter((check) => check.status === "failed")
      .forEach((check) => {
        console.log(
          `- ${check.label}: baseline=${check.baselineValue}, current=${check.currentValue}, delta=${check.delta}, percentDelta=${check.percentDelta ?? "n/a"}${check.reason ? ` (${check.reason})` : ""}`
        );
      });
  }

  if (regressionGate.skippedCount > 0) {
    console.log("Skipped checks:");
    regressionGate.checks
      .filter((check) => check.status === "skipped")
      .forEach((check) => {
        console.log(`- ${check.label}: ${check.reason}`);
      });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = await loadConfig(args.config);
  const externalGateConfig = await loadRegressionGateConfig(args.gateConfig);
  const tier = ensure(config.tiers?.[args.tier], `Unknown perf tier: ${args.tier}`);
  const timeouts = {
    ...DEFAULT_TIMEOUTS,
    ...(config.timeouts ?? {})
  };
  const apiBaseUrl = config.apiBaseUrl;
  const runId = createRunId();
  const transport = args.transport ?? config.transport ?? "poll";

  if (!["poll", "sse"].includes(transport)) {
    throw new Error(`Unsupported transport "${transport}" in the current harness implementation.`);
  }

  const harnessUsers = await buildHarnessUsers(config, tier, runId);
  try {
    const customers = await hydrateUserSessions(harnessUsers.users.customers, apiBaseUrl, timeouts);
    const agents = await hydrateUserSessions(harnessUsers.users.agents, apiBaseUrl, timeouts);
    const managers = await hydrateUserSessions(harnessUsers.users.managers, apiBaseUrl, timeouts);

    ensure(customers.length > 0, "At least one customer session is required.");
    ensure(agents.length > 0, "At least one agent session is required.");
    ensure(managers.length > 0, "At least one manager session is required.");

    await managers[0].client.clearPerfSnapshots().catch(() => null);

    const messageSamples = await runPool(
      tier.messageRounds,
      Math.min(tier.concurrency, customers.length),
      async (index) =>
        runMessageRoundtrip({
          customerClient: cyclePick(customers, index).client,
          observerClient: cyclePick(agents, index).client,
          observerCookie: cyclePick(agents, index).cookie,
          baseUrl: apiBaseUrl,
          transport,
          timeouts
        })
    );

    const handoffSamples = await runPool(
      tier.handoffRounds,
      Math.min(tier.concurrency, Math.min(customers.length, agents.length)),
      async (index) =>
        runHandoffRoundtrip({
          customerClient: cyclePick(customers, index).client,
          agentClient: cyclePick(agents, index).client,
          managerClient: cyclePick(managers, index).client,
          agentIdentity: cyclePick(agents, index).session,
          timeouts
        })
    );

    const managerRefreshSamples = await runPool(
      tier.managerRefreshRounds,
      Math.min(tier.managers, managers.length),
      async (index) => runRefreshRound(cyclePick(managers, index).client, "manager")
    );

    const agentRefreshSamples = await runPool(
      tier.agentRefreshRounds,
      Math.min(tier.agents, agents.length),
      async (index) => runRefreshRound(cyclePick(agents, index).client, "agent")
    );

    const perfSnapshotsResponse = await managers[0].client.listPerfSnapshots({
      limit: 2000
    }).catch(() => ({ payload: { snapshots: [] } }));
    const perfSnapshots = perfSnapshotsResponse.payload?.snapshots ?? [];

    const report = {
      createdAt: new Date().toISOString(),
      tier: args.tier,
      transport,
      apiBaseUrl,
      sessions: {
        customers: customers.length,
        agents: agents.length,
        managers: managers.length
      },
      scenarios: {
        messageRoundtrip: {
          summary: summarizeScenarioSamples(messageSamples, [
            "createConversationPerfMs",
            "fetchConversationPerfMs",
            "sendRequestMs",
            "sendServerMs",
            "sendDbQueryCount",
            "eventVisibleMs",
            "eventServerMs",
            "eventDbQueryCount",
            "avaReplyVisibleMs",
            "replyConversationPerfMs",
            "replyConversationDbQueryCount"
          ]),
          samples: messageSamples
        },
        handoffRoundtrip: {
          summary: summarizeScenarioSamples(handoffSamples, [
            "handoffRequestMs",
            "handoffRequestDbQueryCount",
            "queueVisibleMs",
            "queueDbQueryCount",
            "managerVisibleMs",
            "managerDbQueryCount",
            "claimMs",
            "claimDbQueryCount",
            "repMessageMs",
            "resolveMs",
            "resolveDbQueryCount",
            "ratingMs",
            "followUpMessageMs",
            "returnToAiMs"
          ]),
          samples: handoffSamples
        },
        managerRefresh: {
          summary: summarizeScenarioSamples(managerRefreshSamples, [
            "requestMs",
            "serverMs",
            "dbQueryCount"
          ]),
          samples: managerRefreshSamples
        },
        agentRefresh: {
          summary: summarizeScenarioSamples(agentRefreshSamples, [
            "queueRequestMs",
            "queueServerMs",
            "queueDbQueryCount",
            "realtimeRequestMs",
            "realtimeServerMs",
            "realtimeDbQueryCount"
          ]),
          samples: agentRefreshSamples
        }
      },
      perfSnapshots: {
        count: perfSnapshots.length,
        grouped: groupPerfSnapshots(perfSnapshots)
      }
    };

    const configRegressionGate =
      config.regressionGate && typeof config.regressionGate === "object"
        ? {
            baselineReport:
              typeof config.regressionGate.baselineReport === "string" &&
              config.regressionGate.baselineReport.trim()
                ? path.resolve(path.dirname(args.config), config.regressionGate.baselineReport)
                : undefined,
            rules: Array.isArray(config.regressionGate.rules)
              ? normalizeRegressionRules(config.regressionGate.rules)
              : []
          }
        : null;

    const baselineReportPath =
      args.baseline ??
      externalGateConfig?.baselineReport ??
      configRegressionGate?.baselineReport;
    const regressionRules =
      externalGateConfig?.rules?.length > 0
        ? externalGateConfig.rules
        : configRegressionGate?.rules?.length > 0
          ? configRegressionGate.rules
          : baselineReportPath
            ? createDefaultRegressionRules()
            : [];

    if (baselineReportPath) {
      const baselineReport = JSON.parse(await readFile(baselineReportPath, "utf8"));
      report.regressionGate = evaluateRegressionGate(report, baselineReport, {
        baselineReportPath,
        rules: regressionRules
      });
    }

    const defaultReportPath = path.join(REPORTS_DIRECTORY, `${runId}-${args.tier}.json`);
    const reportPath = args.report ?? defaultReportPath;
    await writeReport(reportPath, report);

    console.log(`Ava chat perf report written to ${reportPath}`);
    console.log(JSON.stringify(report.scenarios.messageRoundtrip.summary, null, 2));
    if (report.regressionGate) {
      printRegressionGateSummary(report.regressionGate);
      if (!report.regressionGate.passed) {
        process.exitCode = 1;
      }
    }
  } finally {
    await harnessUsers.cleanup();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
