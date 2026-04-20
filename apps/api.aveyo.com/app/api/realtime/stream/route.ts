import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { getConversation } from "@/lib/store/mock-store";
import { subscribeToRealtimeInvalidations } from "@/lib/realtime/invalidation-broker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEARTBEAT_MS = 15_000;

function buildSseChunk(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId")?.trim() || null;

    if (auth.role === "customer" && !conversationId) {
      return NextResponse.json(
        { error: "conversationId is required for customer realtime streams." },
        { status: 400 }
      );
    }

    if (conversationId) {
      const conversation = await getConversation(conversationId, auth.user.id);
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      }
    }

    const encoder = new TextEncoder();
    let closed = false;
    let flush = Promise.resolve();
    let unsubscribe: (() => void) | null = null;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enqueue = (event: string, payload: unknown) => {
          flush = flush
            .then(async () => {
              if (closed) {
                return;
              }
              controller.enqueue(encoder.encode(buildSseChunk(event, payload)));
            })
            .catch((error) => {
              console.error("Realtime SSE enqueue failed", error);
            });
        };

        enqueue("ready", {
          mode: conversationId ? "conversation" : "dashboard",
          conversationId
        });

        unsubscribe = await subscribeToRealtimeInvalidations((event) => {
          if (conversationId && event.conversationId !== conversationId) {
            return;
          }
          enqueue(event.kind === "typing" ? "typing" : "invalidate", event);
        });

        heartbeatId = setInterval(() => {
          enqueue("ping", {
            at: new Date().toISOString()
          });
        }, SSE_HEARTBEAT_MS);
      },
      async cancel() {
        closed = true;
        if (heartbeatId !== null) {
          clearInterval(heartbeatId);
        }
        if (unsubscribe) {
          unsubscribe();
        }
        await flush.catch(() => null);
      }
    });

    request.signal.addEventListener("abort", () => {
      closed = true;
      if (heartbeatId !== null) {
        clearInterval(heartbeatId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    console.error("Unable to open realtime stream", error);
    return NextResponse.json({ error: "Unable to open realtime stream." }, { status: 500 });
  }
}
