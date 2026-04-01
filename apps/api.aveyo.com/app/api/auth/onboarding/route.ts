import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/auth/require-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { ServiceError } from "@/lib/service-error";

export const dynamic = "force-dynamic";

interface OnboardingProfileRow {
  full_name: string | null;
  preferred_name: string | null;
  job_description: string | null;
  phone: string | null;
  location: string | null;
  birthday: string | null;
  social_links: Record<string, unknown> | null;
  onboarding_completed: boolean | null;
}

interface OnboardingSubmission {
  password?: unknown;
  preferredName?: unknown;
  jobDescription?: unknown;
  phone?: unknown;
  location?: unknown;
  birthday?: unknown;
  socialLinks?: unknown;
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBirthday(value: unknown) {
  const parsed = normalizeNullableText(value);
  if (!parsed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
    return null;
  }
  return parsed;
}

function normalizeSocialLinks(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const social = value as Record<string, unknown>;
  const links: Record<string, string> = {};
  for (const key of ["linkedin", "instagram", "facebook"]) {
    const normalized = normalizeNullableText(social[key]);
    if (normalized) {
      links[key] = normalized;
    }
  }
  return links;
}

function sanitizeStoredSocialLinks(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const social = value as Record<string, unknown>;
  return {
    linkedin: normalizeNullableText(social.linkedin) ?? "",
    instagram: normalizeNullableText(social.instagram) ?? "",
    facebook: normalizeNullableText(social.facebook) ?? ""
  };
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return null;
  }
  if (value.length >= 10) {
    return value.slice(0, 10);
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    if (auth.role === "customer") {
      throw new ServiceError(403, "Customer onboarding is handled in customer.aveyo.com.");
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        "full_name, preferred_name, job_description, phone, location, birthday, social_links, onboarding_completed"
      )
      .eq("id", auth.user.id)
      .maybeSingle();
    const profile = profileData as OnboardingProfileRow | null;

    if (profileError) {
      throw new ServiceError(500, "Failed to read onboarding profile.");
    }

    if (!profile) {
      throw new ServiceError(404, "Employee profile not found. Please contact an administrator.");
    }

    return NextResponse.json({
      success: true,
      role: auth.role ?? "unknown",
      isEmployee: true,
      onboardingCompleted: Boolean(profile.onboarding_completed),
      profile: {
        fullName: profile.full_name ?? auth.user.name,
        preferredName: profile.preferred_name ?? "",
        jobDescription: profile.job_description ?? "",
        phone: profile.phone ?? "",
        location: profile.location ?? "",
        birthday: toDateInputValue(profile.birthday) ?? "",
        socialLinks: sanitizeStoredSocialLinks(profile.social_links)
      }
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Onboarding GET failed", error);
    return NextResponse.json({ success: false, error: "Unexpected onboarding error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedRequest(request);
    if (auth.role === "customer") {
      throw new ServiceError(403, "Customer onboarding is handled in customer.aveyo.com.");
    }

    const body = (await request.json().catch(() => null)) as OnboardingSubmission | null;
    if (!body) {
      throw new ServiceError(400, "Invalid onboarding payload.");
    }

    const password = normalizeNullableText(body.password);
    if (password && password.length < 6) {
      throw new ServiceError(400, "Password must be at least 6 characters.");
    }

    const supabase = getSupabaseServiceRoleClient();

    if (password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(auth.user.id, {
        password
      });
      if (passwordError) {
        throw new ServiceError(400, "Failed to update password.");
      }
    }

    const updatePayload = {
      preferred_name: normalizeNullableText(body.preferredName),
      job_description: normalizeNullableText(body.jobDescription),
      phone: normalizeNullableText(body.phone),
      location: normalizeNullableText(body.location),
      birthday: normalizeBirthday(body.birthday),
      social_links: normalizeSocialLinks(body.socialLinks),
      onboarding_completed: true
    };

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", auth.user.id)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedProfile) {
      throw new ServiceError(500, "Failed to save onboarding profile.");
    }

    return NextResponse.json({ success: true, onboardingCompleted: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Onboarding POST failed", error);
    return NextResponse.json({ success: false, error: "Unexpected onboarding error." }, { status: 500 });
  }
}

