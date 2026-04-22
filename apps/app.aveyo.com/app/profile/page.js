"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveAppUrl, resolveEnvironment } from "@ava/config/runtime/app-urls";
import { buildAuthLoginUrl } from "../../lib/auth/config";
import { authApiRequest } from "../../lib/auth/session";
import { useAuthSession } from "../../lib/auth/use-auth-session";

export default function ProfilePage() {
  const router = useRouter();
  const session = useAuthSession();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [fullName, setFullName] = useState("Employee");
  const [preferredName, setPreferredName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    linkedin: "",
    instagram: "",
    facebook: ""
  });

  useEffect(() => {
    if (session.loading || session.authenticated || typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.origin}/profile`;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.loading, session.authenticated]);

  useEffect(() => {
    if (session.loading || !session.authenticated || typeof window === "undefined") {
      return;
    }

    if (session.userType === "customer" || session.role === "customer") {
      const customerAppUrl = resolveAppUrl("customer", resolveEnvironment(window.location.hostname));
      window.location.replace(customerAppUrl || "/");
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setLoadingProfile(true);
      setError("");
      setStatus("");

      try {
        const payload = await authApiRequest("/api/auth/onboarding", { method: "GET" });
        if (cancelled) {
          return;
        }

        if (!payload?.success) {
          setError(payload?.error ?? "Unable to load your profile.");
          return;
        }

        setFullName(payload.profile?.fullName || session.user?.name || "Employee");
        setPreferredName(payload.profile?.preferredName || "");
        setJobDescription(payload.profile?.jobDescription || "");
        setPhone(payload.profile?.phone || "");
        setLocation(payload.profile?.location || "");
        setBirthday(payload.profile?.birthday || "");
        setSocialLinks({
          linkedin: payload.profile?.socialLinks?.linkedin || "",
          instagram: payload.profile?.socialLinks?.instagram || "",
          facebook: payload.profile?.socialLinks?.facebook || ""
        });
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session.authenticated, session.loading, session.role, session.user?.name, session.userType]);

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    try {
      const payload = await authApiRequest("/api/auth/onboarding", {
        method: "POST",
        body: JSON.stringify({
          preferredName,
          jobDescription,
          phone,
          location,
          birthday,
          socialLinks
        })
      });

      if (!payload?.success) {
        setError(payload?.error ?? "Unable to save your profile.");
        return;
      }

      setStatus("Profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your profile.");
    } finally {
      setSubmitting(false);
    }
  }

  if (session.loading || loadingProfile) {
    return <main className="loading-shell">Loading your profile...</main>;
  }

  if (!session.authenticated) {
    return <main className="loading-shell">Redirecting to login...</main>;
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <div className="profile-page-header">
          <p className="onboarding-muted">Employee profile</p>
          <h1>Your profile</h1>
          <p className="onboarding-muted">Keep your internal directory and contact details up to date.</p>
        </div>

        <div className="profile-summary">
          <p>
            <strong>Name:</strong> {fullName}
          </p>
          <p>
            <strong>Email:</strong> {session.user?.email ?? "Unknown"}
          </p>
        </div>

        <form onSubmit={handleSaveProfile}>
          <label className="onboarding-field">
            <span>Preferred name</span>
            <input
              type="text"
              value={preferredName}
              onChange={(event) => setPreferredName(event.target.value)}
              placeholder="How should teammates address you?"
            />
          </label>

          <label className="onboarding-field">
            <span>Job description</span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={4}
              placeholder="Describe your role, team, or responsibilities"
            />
          </label>

          <label className="onboarding-field">
            <span>Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(555) 555-5555"
            />
          </label>

          <label className="onboarding-field">
            <span>Location</span>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City, State"
            />
          </label>

          <label className="onboarding-field">
            <span>Birthday</span>
            <input
              type="date"
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
            />
          </label>

          <label className="onboarding-field">
            <span>LinkedIn</span>
            <input
              type="url"
              value={socialLinks.linkedin}
              onChange={(event) =>
                setSocialLinks((current) => ({ ...current, linkedin: event.target.value }))
              }
              placeholder="https://linkedin.com/in/your-profile"
            />
          </label>

          <label className="onboarding-field">
            <span>Instagram</span>
            <input
              type="url"
              value={socialLinks.instagram}
              onChange={(event) =>
                setSocialLinks((current) => ({ ...current, instagram: event.target.value }))
              }
              placeholder="https://instagram.com/your-handle"
            />
          </label>

          <label className="onboarding-field">
            <span>Facebook</span>
            <input
              type="url"
              value={socialLinks.facebook}
              onChange={(event) =>
                setSocialLinks((current) => ({ ...current, facebook: event.target.value }))
              }
              placeholder="https://facebook.com/your-profile"
            />
          </label>

          <div className="onboarding-actions">
            <button type="button" onClick={() => router.push("/")}>
              Back to dashboard
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>

        {error ? <p className="onboarding-error">{error}</p> : null}
        {status ? <p className="profile-success">{status}</p> : null}
      </section>
    </main>
  );
}
