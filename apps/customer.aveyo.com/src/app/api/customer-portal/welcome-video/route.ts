import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isCustomerPortalCustomerSession } from "@/lib/platform-auth/customer-portal-access";
import {
  applyPlatformSetCookieHeaders,
  fetchPlatformSessionForRequest
} from "@/lib/platform-auth/server-session";

const WELCOME_VIDEO_SEEN_AT_KEY = "portal_welcome_video_seen_at";

interface CustomerProfileMetadataRow {
  metadata: Record<string, unknown> | null;
}

function getServiceRoleSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration for customer portal welcome video.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function hasSeenWelcomeVideo(metadata: Record<string, unknown>) {
  const seenValue = metadata[WELCOME_VIDEO_SEEN_AT_KEY];
  return seenValue === true || (typeof seenValue === "string" && seenValue.trim().length > 0);
}

export async function POST(request: Request) {
  const session = await fetchPlatformSessionForRequest(request);
  if (!session.ok || !session.payload?.authenticated) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  if (!isCustomerPortalCustomerSession(session.payload)) {
    const response = NextResponse.json({ showWelcomeVideo: false });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  const user = session.payload.user;
  if (!user?.id || !user.email) {
    const response = NextResponse.json(
      { error: "Customer profile is missing required session fields.", showWelcomeVideo: false },
      { status: 400 }
    );
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data: existingProfile, error: profileError } = await supabase
      .schema("ava")
      .from("customer_profiles")
      .select("metadata")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const metadata = normalizeMetadata((existingProfile as CustomerProfileMetadataRow | null)?.metadata);
    if (hasSeenWelcomeVideo(metadata)) {
      const response = NextResponse.json({ showWelcomeVideo: false });
      applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
      return response;
    }

    const nextMetadata = {
      ...metadata,
      [WELCOME_VIDEO_SEEN_AT_KEY]: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .schema("ava")
      .from("customer_profiles")
      .upsert(
        {
          auth_user_id: user.id,
          email: user.email,
          full_name: user.name,
          metadata: nextMetadata
        },
        { onConflict: "auth_user_id" }
      );

    if (upsertError) {
      throw upsertError;
    }

    const response = NextResponse.json({ showWelcomeVideo: true });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  } catch (error) {
    console.error("[customer-portal/api/welcome-video] Failed to resolve welcome video state", error);
    const response = NextResponse.json(
      { error: "Failed to resolve welcome video state.", showWelcomeVideo: false },
      { status: 500 }
    );
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }
}
