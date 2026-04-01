"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildAuthLoginUrl } from "../../lib/auth/config";
import { authApiRequest } from "../../lib/auth/session";
import { useAuthSession } from "../../lib/auth/use-auth-session";

function resolveReturnTo(rawValue) {
  if (!rawValue) {
    return "/";
  }

  try {
    const parsed = new URL(rawValue);
    const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
    const isAllowedHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".aveyo.com");

    if (!isHttp || !isAllowedHost) {
      return "/";
    }
    return parsed.toString();
  } catch {
    if (rawValue.startsWith("/")) {
      return rawValue;
    }
    return "/";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const session = useAuthSession();

  const [step, setStep] = useState("welcome");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("/");

  const [fullName, setFullName] = useState("Employee");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (typeof window === "undefined") {
      return;
    }
    const query = new URLSearchParams(window.location.search);
    setReturnTo(resolveReturnTo(query.get("returnTo")));
  }, []);

  const goToReturnTarget = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (returnTo.startsWith("http://") || returnTo.startsWith("https://")) {
      window.location.replace(returnTo);
      return;
    }

    router.replace(returnTo);
  }, [router, returnTo]);

  useEffect(() => {
    if (session.loading || session.authenticated || typeof window === "undefined") {
      return;
    }

    const onboardingUrl = `${window.location.origin}/onboarding${window.location.search}`;
    window.location.replace(buildAuthLoginUrl(onboardingUrl));
  }, [session.loading, session.authenticated]);

  useEffect(() => {
    if (session.loading || !session.authenticated) {
      return;
    }

    let cancelled = false;

    async function loadOnboarding() {
      setLoadingProfile(true);
      setError("");
      try {
        const payload = await authApiRequest("/api/auth/onboarding", { method: "GET" });
        if (cancelled) {
          return;
        }

        if (!payload?.success) {
          setError(payload?.error ?? "Unable to load onboarding details.");
          return;
        }

        if (payload.onboardingCompleted) {
          goToReturnTarget();
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
        setError(loadError instanceof Error ? loadError.message : "Unable to load onboarding details.");
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void loadOnboarding();
    return () => {
      cancelled = true;
    };
  }, [session.loading, session.authenticated, session.user?.name, goToReturnTarget]);

  const continueFromPasswordStep = () => {
    setError("");

    const hasPassword = password.trim().length > 0 || confirmPassword.trim().length > 0;
    if (!hasPassword) {
      setStep("profile");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStep("profile");
  };

  const submitOnboarding = async () => {
    setSubmitting(true);
    setError("");

    try {
      const payload = await authApiRequest("/api/auth/onboarding", {
        method: "POST",
        body: JSON.stringify({
          password: password.trim().length > 0 ? password : null,
          preferredName,
          jobDescription,
          phone,
          location,
          birthday,
          socialLinks
        })
      });

      if (!payload?.success) {
        setError(payload?.error ?? "Unable to complete onboarding.");
        return;
      }

      setStep("complete");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  if (session.loading || loadingProfile) {
    return <main className="loading-shell">Preparing onboarding...</main>;
  }

  if (!session.authenticated) {
    return <main className="loading-shell">Redirecting to login...</main>;
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        {step !== "welcome" && step !== "complete" ? (
          <div className="onboarding-progress" aria-hidden="true">
            <div className={step === "password" || step === "profile" ? "active" : ""} />
            <div className={step === "profile" ? "active" : ""} />
          </div>
        ) : null}

        {step === "welcome" ? (
          <div className="onboarding-section">
            <h1>Welcome, {fullName}.</h1>
            <p className="onboarding-muted">
              Complete your employee onboarding once, then continue back to your app.
            </p>
            <div className="onboarding-checklist">
              <p>Set a password (optional if one is already set)</p>
              <p>Complete your employee profile</p>
            </div>
            <button
              className="onboarding-primary-button"
              type="button"
              onClick={() => setStep("password")}
            >
              Get started
            </button>
          </div>
        ) : null}

        {step === "password" ? (
          <div className="onboarding-section">
            <h1>Set your password</h1>
            <p className="onboarding-muted">
              If you already set one in auth, you can skip this step.
            </p>

            <label className="onboarding-field">
              <span>New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </label>

            <label className="onboarding-field">
              <span>Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
              />
            </label>

            <div className="onboarding-actions">
              <button type="button" onClick={() => setStep("welcome")} disabled={submitting}>
                Back
              </button>
              <button type="button" onClick={continueFromPasswordStep} disabled={submitting}>
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === "profile" ? (
          <div className="onboarding-section">
            <h1>Complete your profile</h1>
            <p className="onboarding-muted">
              Add optional details so teammates can easily connect with you.
            </p>

            <label className="onboarding-field">
              <span>Preferred name</span>
              <input
                type="text"
                value={preferredName}
                onChange={(event) => setPreferredName(event.target.value)}
                placeholder="What should people call you?"
              />
            </label>

            <label className="onboarding-field">
              <span>Job description</span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Describe your role and responsibilities..."
                rows={4}
              />
            </label>

            <label className="onboarding-field">
              <span>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(555) 123-4567"
              />
            </label>

            <label className="onboarding-field">
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City, State or Remote"
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
                  setSocialLinks((previous) => ({ ...previous, linkedin: event.target.value }))
                }
                placeholder="https://www.linkedin.com/in/..."
              />
            </label>

            <label className="onboarding-field">
              <span>Instagram</span>
              <input
                type="url"
                value={socialLinks.instagram}
                onChange={(event) =>
                  setSocialLinks((previous) => ({ ...previous, instagram: event.target.value }))
                }
                placeholder="https://www.instagram.com/..."
              />
            </label>

            <label className="onboarding-field">
              <span>Facebook</span>
              <input
                type="url"
                value={socialLinks.facebook}
                onChange={(event) =>
                  setSocialLinks((previous) => ({ ...previous, facebook: event.target.value }))
                }
                placeholder="https://www.facebook.com/..."
              />
            </label>

            <div className="onboarding-actions">
              <button type="button" onClick={() => setStep("password")} disabled={submitting}>
                Back
              </button>
              <button type="button" onClick={() => void submitOnboarding()} disabled={submitting}>
                {submitting ? "Saving..." : "Complete setup"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "complete" ? (
          <div className="onboarding-section">
            <h1>All set.</h1>
            <p className="onboarding-muted">
              Your employee onboarding is complete. Continue back to your app.
            </p>
            <button className="onboarding-primary-button" type="button" onClick={goToReturnTarget}>
              Continue
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="onboarding-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}

