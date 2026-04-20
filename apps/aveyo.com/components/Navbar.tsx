"use client";

import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { resolveAppUrl, resolveEnvironment } from "@ava/config/runtime/app-urls";
import {
  buildAuthLoginUrl as buildSharedAuthLoginUrl,
  resolveApiBaseUrl,
  resolveAuthAppUrl,
  resolvePlatformAppUrl
} from "@ava/config/runtime/auth-urls";

const SCROLL_THRESHOLD = 48;
const AUTH_SESSION_POLL_INTERVAL_MS = 30000;
const FLOATING_PILL_BACKGROUND =
  "linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.08) 100%), linear-gradient(90deg, rgba(76, 76, 76, 0.18) 0%, rgba(115, 115, 115, 0.18) 49.519%, rgba(78, 78, 78, 0.18) 100%)";

type AuthSessionUser = {
  name: string | null;
  avatarUrl: string | null;
};

type AuthSessionState = {
  loading: boolean;
  authenticated: boolean;
  user: AuthSessionUser | null;
};

function getApiBaseUrl() {
  const environment =
    typeof window === "undefined" ? "local" : resolveEnvironment(window.location.hostname);
  const resolved = resolveAppUrl("api", environment);
  return resolveApiBaseUrl({
    configuredPlatformApiBaseUrl: process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL,
    configuredAvaApiBaseUrl: process.env.NEXT_PUBLIC_AVA_API_BASE_URL,
    fallbackApiBaseUrl: resolved || "https://api.aveyo.com"
  });
}

function getAuthAppUrl() {
  const environment =
    typeof window === "undefined" ? "local" : resolveEnvironment(window.location.hostname);
  const resolved = resolveAppUrl("auth", environment);
  return resolveAuthAppUrl({
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    fallbackAuthAppUrl: resolved || "https://auth.aveyo.com"
  });
}

function getEmployeeAppUrl() {
  const environment =
    typeof window === "undefined" ? "local" : resolveEnvironment(window.location.hostname);
  const resolved = resolveAppUrl("dashboard", environment);
  return resolvePlatformAppUrl({
    configuredPlatformAppUrl: process.env.NEXT_PUBLIC_PLATFORM_APP_URL,
    fallbackPlatformAppUrl: resolved || "https://app-staging.aveyo.com"
  });
}

function buildAuthLoginUrl(returnTo: string) {
  return buildSharedAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    authAppUrl: getAuthAppUrl()
  });
}

function normalizeSessionUser(payload: unknown): AuthSessionUser | null {
  if (!payload || typeof payload !== "object" || !("user" in payload)) {
    return null;
  }

  const user = payload.user;
  if (!user || typeof user !== "object") {
    return null;
  }

  const userRecord = user as Record<string, unknown>;
  const rawName = userRecord.name;
  const rawAvatarUrl = userRecord.avatarUrl;
  const name = typeof rawName === "string" && rawName.trim() ? rawName : null;
  const avatarUrl =
    typeof rawAvatarUrl === "string" && rawAvatarUrl.trim() ? rawAvatarUrl : null;

  return { name, avatarUrl };
}

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSessionState>({
    loading: true,
    authenticated: false,
    user: null,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isScrolled) return;
    setIsMobileMenuOpen(false);
  }, [isScrolled]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/session`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok || !payload?.authenticated) {
          setAuthSession({
            loading: false,
            authenticated: false,
            user: normalizeSessionUser(payload),
          });
          return;
        }

        setAuthSession({
          loading: false,
          authenticated: true,
          user: normalizeSessionUser(payload),
        });
      } catch {
        if (cancelled) return;
        setAuthSession({
          loading: false,
          authenticated: false,
          user: null,
        });
      }
    }

    void loadSession();
    const interval = window.setInterval(() => {
      void loadSession();
    }, AUTH_SESSION_POLL_INTERVAL_MS);

    const onFocus = () => {
      void loadSession();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const avatarInitial =
    (authSession.user?.name?.trim()?.charAt(0).toUpperCase() || "A");

  const handleAuthButtonClick = () => {
    if (typeof window === "undefined") return;
    const destination = authSession.authenticated
      ? getEmployeeAppUrl()
      : buildAuthLoginUrl(window.location.href);
    window.location.assign(destination);
  };

  const navLinks = [
    { name: "Why Solar", href: "/why-solar" },
    { name: "Process", href: "/process" },
    { name: "Commercial", href: "/commercial" },
    { name: "About", href: "/about" },
    { name: "Newsfeed", href: "/newsfeed" },
    { name: "Contact", href: "/contact" }
  ];

  const isActiveLink = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        isScrolled ? "py-5" : "py-0"
      }`}
      style={homepageStyleVars}
    >
      <div
        className={`mx-auto transition-all duration-500 ${
          isScrolled
            ? "w-[calc(100%-2rem)] max-w-[1240px]"
            : "w-full max-w-[1920px] px-8 md:px-16 lg:px-[30px]"
        }`}
      >
        <div
          className={`relative flex items-center justify-between transition-all duration-500 ${
            isScrolled
              ? "overflow-hidden rounded-[90px] px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.18)] backdrop-blur-[32.5px] md:px-[30px] md:py-5"
              : "h-[100px]"
          }`}
          style={isScrolled ? { background: FLOATING_PILL_BACKGROUND } : undefined}
        >
          {isScrolled && (
            <div
              className="pointer-events-none absolute inset-0 z-0 rounded-[90px] opacity-[0.06] mix-blend-overlay"
              style={{
                backgroundImage: "url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')",
                backgroundSize: "424px 424px",
              }}
            />
          )}
          {isScrolled && (
            <CardGradientBorder className="rounded-[90px]" />
          )}

          {/* Logo */}
          <Link href="/" className="relative z-10 flex items-center">
            <Image
              src="/aveyo-logo.svg"
              alt="Aveyo"
              width={110}
              height={24}
              className={`w-auto transition-all duration-500 ${isScrolled ? "h-[19px]" : "h-6"}`}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="relative z-10 hidden items-center gap-7 transition-all duration-500 lg:flex xl:gap-9">
            {/* Nav Links */}
            <div className="flex items-center gap-5 transition-all duration-500 xl:gap-7">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-extrabold text-white transition-opacity hover:opacity-80 xl:text-[length:var(--home-paragraph)]"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Right Side: CTA Button + Menu Icon */}
            <div className="flex items-center gap-5">
              <Link
                href="/contact#sales-form"
                className="inline-flex h-10 items-center justify-center rounded-[var(--home-button-radius)] bg-[color:var(--home-white)] px-6 text-sm font-extrabold text-[color:var(--home-black)] transition-colors hover:bg-white/90"
              >
                Pick a plan
              </Link>
              <button
                className="flex h-[55px] w-[55px] items-center justify-center rounded-full border border-white bg-[color:var(--home-white)] text-[color:var(--home-black)] transition-colors hover:bg-white/90"
                type="button"
                onClick={handleAuthButtonClick}
                aria-label={authSession.authenticated ? "Open account" : "Login"}
                title={authSession.authenticated ? "Open account" : "Login"}
              >
                {authSession.authenticated ? (
                  authSession.user?.avatarUrl ? (
                    <div
                      className="h-full w-full rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${authSession.user.avatarUrl}")` }}
                    />
                  ) : (
                    <span className="text-base font-extrabold">{avatarInitial}</span>
                  )
                ) : authSession.loading ? (
                  <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                      stroke="var(--home-black)"
                      strokeWidth="2"
                    />
                    <path
                      d="M4 21C4 17.6863 7.58172 15 12 15C16.4183 15 20 17.6863 20 21"
                      stroke="var(--home-black)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white bg-[color:var(--home-white)] text-[color:var(--home-black)] lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`mx-auto w-[calc(100%-2rem)] max-w-[1240px] overflow-hidden transition-all duration-300 lg:hidden ${
          isMobileMenuOpen ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className="space-y-4 rounded-[24px] px-6 py-6 backdrop-blur-xl"
          style={{ background: FLOATING_PILL_BACKGROUND }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-80"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/contact#sales-form"
            className="mt-4 inline-flex w-full items-center justify-center rounded-[var(--home-button-radius)] bg-[color:var(--home-white)] px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-extrabold text-[color:var(--home-black)]"
          >
            Pick a plan
          </Link>
        </div>
      </div>
    </nav>
  );
}
