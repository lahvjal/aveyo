"use client";

import { BrandLoader } from "@ava/ui";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { homepageStyleVars } from "@/lib/homepage-design-system";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  buildAuthLoginUrl,
  getEmployeeAppUrl,
  useMarketingSiteAuthSession
} from "@/lib/auth/session";
import { stateNavLinks } from "@/lib/state-page-data";

type NavLink = {
  name: string;
  href: string;
};

type NavItem =
  | {
      type: "group";
      name: string;
      links: NavLink[];
    }
  | ({
      type: "link";
    } & NavLink);

const SCROLL_THRESHOLD = 48;
const FLOATING_PILL_BACKGROUND =
  "linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.08) 100%), linear-gradient(90deg, rgba(76, 76, 76, 0.18) 0%, rgba(115, 115, 115, 0.18) 49.519%, rgba(78, 78, 78, 0.18) 100%)";
const NAV_MENU_BACKGROUND =
  "linear-gradient(180deg, rgba(76, 78, 78, 0.98) 0%, rgba(33, 33, 32, 0.98) 100%)";

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const authSession = useMarketingSiteAuthSession();
  const displayAuthSession = isHydrated
    ? authSession
    : {
        ...authSession,
        loading: true,
        authenticated: false,
        user: null
      };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isScrolled) return;
    setIsMobileMenuOpen(false);
    setOpenDesktopGroup(null);
  }, [isScrolled]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenDesktopGroup(null);
    setOpenMobileGroup(null);
  }, [pathname]);

  const avatarInitial =
    (displayAuthSession.user?.name?.trim()?.charAt(0).toUpperCase() || "A");

  const handleAuthButtonClick = () => {
    if (typeof window === "undefined") return;
    const destination = authSession.authenticated
      ? getEmployeeAppUrl()
      : buildAuthLoginUrl(window.location.href);
    window.location.assign(destination);
  };

  const navItems: NavItem[] = [
    {
      type: "group",
      name: "Solar",
      links: [
        { name: "Why Solar", href: "/why-solar" },
        { name: "Process", href: "/process" },
        { name: "Commercial", href: "/commercial" }
      ]
    },
    {
      type: "group",
      name: "Locations",
      links: stateNavLinks
    },
    {
      type: "group",
      name: "Company",
      links: [
        { name: "About", href: "/about" },
        { name: "Newsfeed", href: "/newsfeed" },
        { name: "Contact", href: "/contact" }
      ]
    },
    {
      type: "link",
      name: "Reviews",
      href: "/reviews"
    }
  ];

  const isActiveLink = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);
  const isActiveGroup = (links: Array<{ name: string; href: string }>) =>
    links.some((link) => isActiveLink(link.href));

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
              ? "rounded-[90px] px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.18)] md:px-[30px] md:py-5"
              : "h-[100px]"
          }`}
        >
          {isScrolled ? (
            <div
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[90px] backdrop-blur-[32.5px]"
              style={{ background: FLOATING_PILL_BACKGROUND }}
            >
              <div
                className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
                style={{
                  backgroundImage: "url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')",
                  backgroundSize: "424px 424px",
                }}
              />
              <CardGradientBorder className="rounded-[90px]" />
            </div>
          ) : null}

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
              {navItems.map((item) =>
                item.type === "group" ? (
                  <div
                    key={item.name}
                    className="relative"
                    onMouseEnter={() => setOpenDesktopGroup(item.name)}
                    onMouseLeave={() => setOpenDesktopGroup((current) => (current === item.name ? null : current))}
                  >
                    <button
                      type="button"
                      className={`flex items-center gap-2 text-sm font-extrabold text-white transition-opacity xl:text-[length:var(--home-h7)] ${
                        openDesktopGroup === item.name || isActiveGroup(item.links) ? "opacity-100" : "opacity-80 hover:opacity-100"
                      }`}
                      onClick={() =>
                        setOpenDesktopGroup((current) => (current === item.name ? null : item.name))
                      }
                      aria-expanded={openDesktopGroup === item.name}
                      aria-haspopup="menu"
                    >
                      <span>{item.name}</span>
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          openDesktopGroup === item.name ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <div
                      className={`absolute left-1/2 top-full z-20 mt-3 w-max min-w-[220px] -translate-x-1/2 transition-all duration-200 ${
                        openDesktopGroup === item.name
                          ? "visible translate-y-0 opacity-100"
                          : "invisible -translate-y-1 opacity-0"
                      }`}
                    >
                      <div
                        className="relative overflow-hidden rounded-[var(--home-card-radius)] border border-white/10 px-3 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)]"
                        style={{ background: NAV_MENU_BACKGROUND }}
                      >
                        <CardGradientBorder className="rounded-[var(--home-card-radius)]" />
                        <div className="relative z-[2] flex flex-col">
                          {item.links.map((link) => (
                            <Link
                              key={link.name}
                              href={link.href}
                              className={`rounded-[var(--home-card-radius)] px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-extrabold text-white transition-colors ${
                                isActiveLink(link.href) ? "bg-white/10" : "hover:bg-white/5"
                              }`}
                              onClick={() => setOpenDesktopGroup(null)}
                            >
                              {link.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`text-sm font-extrabold text-white transition-opacity xl:text-[length:var(--home-h7)] ${
                      isActiveLink(item.href) ? "opacity-100" : "opacity-80 hover:opacity-100"
                    }`}
                    onClick={() => setOpenDesktopGroup(null)}
                  >
                    {item.name}
                  </Link>
                )
              )}
            </div>

            {/* Right Side: CTA Button + Menu Icon */}
            <div className="flex items-center gap-5">
              <Link
                href="/contact#sales-form"
                className="inline-flex items-center justify-center rounded-[var(--home-button-radius)] bg-[color:var(--home-white)] px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-extrabold text-[color:var(--home-black)] transition-colors hover:bg-white/90"
              >
                Pick a plan
              </Link>
              <button
                className="flex h-[55px] w-[55px] items-center justify-center rounded-full border border-white bg-[color:var(--home-white)] text-[color:var(--home-black)] transition-colors hover:bg-white/90"
                type="button"
                onClick={handleAuthButtonClick}
                aria-label={displayAuthSession.authenticated ? "Open account" : "Login"}
                title={displayAuthSession.authenticated ? "Open account" : "Login"}
              >
                {displayAuthSession.authenticated ? (
                  displayAuthSession.user?.avatarUrl ? (
                    <div
                      className="h-full w-full rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${displayAuthSession.user.avatarUrl}")` }}
                    />
                  ) : (
                    <span className="text-base font-extrabold">{avatarInitial}</span>
                  )
                ) : displayAuthSession.loading ? (
                  <BrandLoader size={34} tone="dark" label="Loading account" />
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
          isMobileMenuOpen ? "mt-3 max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className="space-y-4 overflow-hidden rounded-[24px] border border-white/10 px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.24)]"
          style={{ background: NAV_MENU_BACKGROUND }}
        >
          {navItems.map((item) =>
            item.type === "group" ? (
              <div key={item.name} className="rounded-[var(--home-card-radius)] bg-white/5">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-[var(--home-button-px)] py-[var(--home-button-py)] text-left text-[length:var(--home-h7)] font-extrabold text-white"
                  onClick={() =>
                    setOpenMobileGroup((current) => (current === item.name ? null : item.name))
                  }
                  aria-expanded={openMobileGroup === item.name}
                >
                  <span>{item.name}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${
                      openMobileGroup === item.name ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div
                  className={`grid overflow-hidden transition-all duration-200 ${
                    openMobileGroup === item.name ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0">
                    <div className="flex flex-col px-4 pb-3">
                      {item.links.map((link) => (
                        <Link
                          key={link.name}
                          href={link.href}
                          className={`rounded-[var(--home-card-radius)] px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-extrabold text-white transition-colors ${
                            isActiveLink(link.href) ? "bg-white/10" : "hover:bg-white/5"
                          }`}
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setOpenMobileGroup(null);
                          }}
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={`block rounded-[var(--home-card-radius)] bg-white/5 px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-extrabold text-white transition-colors ${
                  isActiveLink(item.href) ? "bg-white/10" : "hover:bg-white/10"
                }`}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setOpenMobileGroup(null);
                }}
              >
                {item.name}
              </Link>
            )
          )}
          <Link
            href="/contact#sales-form"
            className="mt-4 inline-flex w-full items-center justify-center rounded-[var(--home-button-radius)] bg-[color:var(--home-white)] px-[var(--home-button-px)] py-[var(--home-button-py)] text-[length:var(--home-h7)] font-extrabold text-[color:var(--home-black)]"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Pick a plan
          </Link>
        </div>
      </div>
    </nav>
  );
}
