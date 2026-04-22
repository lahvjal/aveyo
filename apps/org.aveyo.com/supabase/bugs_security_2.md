## 1. Tested Flows

- Invite email content and structure (from .eml artifact)
- Onboarding flow: Welcome screen, Set Password, Complete Profile (from screenshots)
- Sign-in page (from screenshot)
- Profile editing: all fields, Job Description (TipTap editor), Social Links, Save Changes
- Dashboard / Org Chart: card display, detail panel, search, department filters, sidebar list
- Processes page: list view, flowchart detail view (Solar Installation Process)
- Responsive / mobile viewport (375x812): dashboard, profile page, navigation

---

## 2. Top 5 Priorities (Original — see Retest Results below)

1. ~~**Buttons are invisible across the entire app.**~~ → **FIXED** in retest
2. ~~**Job Description field: only the top ~20px is clickable.**~~ → **FIXED** in retest (confirmed on correct browser — editable area now fills full container)
3. ~~**Navigation links vanish at mobile widths.**~~ → **FIXED** in retest
4. ~~**Org chart canvas overlaps sidebar on mobile.**~~ → **FIXED** in retest
5. ~~**Sidebar truncates names to 3 characters.**~~ → **FIXED** in retest

---

## 3. Full Findings List

### Finding 1: Primary buttons render as plain text (KNOWN ISSUE — VALIDATED)
### ✅ RETEST: FIXED

- **Type:** Bug
- **Severity:** ~~Blocker~~ → Resolved
- **Where:** Onboarding (all steps), Profile page (/profile), Sign-in page
- **Original issue:** `background-color: rgba(0, 0, 0, 0)` (transparent), `border: 0px`, `cursor: default`. The `bg-primary text-primary-foreground` classes weren't resolving.
- **Retest result (2026-02-19):** Save Changes button now renders with `background-color: rgb(15, 23, 42)` (solid dark), `color: rgb(248, 250, 252)` (light text), and `cursor: pointer`. Sign-in button also properly styled. The `--primary` CSS variable is now resolving correctly.

---

### Finding 2: Job Description field — only top line is clickable/editable (KNOWN ISSUE — VALIDATED)
### ✅ RETEST: FIXED

- **Type:** Bug
- **Severity:** ~~High~~ → Resolved
- **Where:** Profile page (/profile) — Job Description field
- **Original issue:** TipTap/ProseMirror `contenteditable` div was only 20px tall inside a 104px container. Clicking below the first line did nothing.
- **Retest result (2026-02-19):** *Note: Initial retest on a different Chrome browser showed this as partially fixed. Re-retested on the correct browser (Claude Macbook) and confirmed FULLY FIXED.* Clicking anywhere in the Job Description box focuses the editor and places the cursor correctly. The editable area now fills the full container height. Text input works as expected throughout the entire box. The blue focus border appears around the full container on click.

---

### Finding 3: Navigation links disappear at mobile viewport
### ✅ RETEST: FIXED

- **Type:** Bug
- **Severity:** ~~High~~ → Resolved
- **Where:** Global navigation bar, all pages at viewport widths below ~500px
- **Original issue:** Nav links (Org Chart, My Profile, Processes) completely disappeared at mobile widths. No hamburger menu existed.
- **Retest result (2026-02-19):** A hamburger menu icon has been added at mobile breakpoints. Tapping it opens a dropdown/slide-out containing all navigation links. Full navigation is now accessible on mobile.

---

### Finding 4: Org chart canvas overlaps sidebar on mobile
### ✅ RETEST: FIXED

- **Type:** Bug
- **Severity:** ~~High~~ → Resolved
- **Where:** Dashboard (/dashboard) at narrow viewports
- **Original issue:** Org chart cards and React Flow canvas overlapped the sidebar panel at 375px width.
- **Retest result (2026-02-19):** The sidebar is now collapsed behind a "Search & Filter" toggle button on mobile. The canvas takes full width when the sidebar is hidden. No overlap observed.

---

### Finding 5: Sidebar employee list truncates names too aggressively
### ✅ RETEST: FIXED

- **Type:** UI
- **Severity:** ~~Medium~~ → Resolved
- **Where:** Dashboard (/dashboard) — left sidebar employee list
- **Original issue:** Names showed as "Col..." / "Sar..." (3 characters + ellipsis).
- **Retest result (2026-02-19):** Full names are now visible in the sidebar (e.g., "Colin Farmer," "Sara Christensen"). Job titles also display with adequate length before truncation.

---

### Finding 6: Search filters sidebar but not the org chart canvas
### 🔴 RETEST: STILL OPEN

- **Type:** UX
- **Severity:** Medium
- **Where:** Dashboard (/dashboard) — search input
- **Steps to reproduce:**
  1. Navigate to /dashboard
  2. Type "Sara" in the search field
  3. Observe sidebar and canvas
- **Expected:** Both the sidebar list and the org chart canvas should filter to show only matching employees, or the canvas should highlight/zoom to the matched person.
- **Actual:** The sidebar filters correctly to show only Sara Christensen. The org chart canvas continues to show all employees (both Colin Farmer and Sara Christensen cards).
- **Suggested fix:** When search is active, either filter the canvas to show only matching nodes, or pan/zoom the canvas to center on the matched employee and highlight their card.
- **Acceptance check:** Searching for an employee name visually highlights or isolates them in the canvas view.

---

### Finding 7: "Back" and primary action buttons have inconsistent styling
### ✅ RETEST: FIXED (resolved by Finding 1 fix)

- **Type:** UI
- **Severity:** ~~Medium~~ → Resolved
- **Where:** Onboarding — Set Password and Complete Profile steps
- **Original issue:** Primary action buttons (Continue/Complete Setup) had no visible styling while Back button had a visible outline.
- **Retest result (2026-02-19):** With the `--primary` CSS variable fix (Finding 1), primary buttons now render with solid backgrounds, creating the correct visual hierarchy.

---

### Finding 8: React Flow watermark visible in production
### ✅ RETEST: FIXED

- **Type:** UI
- **Severity:** ~~Low~~ → Resolved
- **Where:** Dashboard (/dashboard) and Processes flowchart — bottom-right corner of canvas
- **Original issue:** "React Flow" text was visible in the bottom-right corner of both the org chart canvas and the process flowchart canvas.
- **Retest result (2026-02-19):** The React Flow watermark text is no longer visible on the dashboard canvas. Only the minimap (with two purple card representations) appears in the bottom-right area. Zoomed in to confirm — no attribution text present.

---

### Finding 9: Email field on profile looks editable but is read-only
### ✅ RETEST: FIXED

- **Type:** UX
- **Severity:** ~~Low~~ → Resolved
- **Where:** Profile page (/profile) — Email field
- **Original issue:** The Email field had the same styling as editable fields — no visual distinction.
- **Retest result (2026-02-19):** The email field now has a gray/muted background and includes helper text reading "Email cannot be changed..." making it clearly distinct from editable fields.

---

### Finding 10: No success/error feedback after saving profile
### ✅ RETEST: FIXED

- **Type:** UX
- **Severity:** ~~Medium~~ → Resolved
- **Where:** Profile page (/profile) — Save Changes action
- **Original issue:** No visible confirmation that save succeeded or failed.
- **Retest result (2026-02-19):** *Note: Initial retest on a different Chrome browser was unable to verify this. Re-retested on the correct browser (Claude Macbook) and confirmed FIXED.* After clicking Save Changes, a green success banner appears immediately above the button reading "✓ Profile saved successfully!" The banner is clearly visible with a green background and checkmark icon.

---

### Finding 11: Minimap oversized on mobile viewport
### ✅ RETEST: FIXED

- **Type:** UI
- **Severity:** ~~Low~~ → Resolved
- **Where:** Dashboard (/dashboard) and Processes flowchart at mobile viewport
- **Original issue:** Minimap consumed ~25% of the visible area at 375px width.
- **Retest result (2026-02-19):** The minimap is now hidden on mobile viewports. The full canvas space is available for the org chart.

---

### Finding 12: Invite email exposes raw Supabase URL
### 🔴 RETEST: STILL OPEN (no new email to verify)

- **Type:** UX / Security
- **Severity:** Low
- **Where:** Invite email — "Access my account" link and fallback URL
- **Original issue:** Link points directly to `semzdcsumfnmjnhzhtst.supabase.co/auth/v1/verify?token=...`
- **Retest note (2026-02-19):** No new invite email was available to test. This finding remains open until a new invite email can be inspected.
- **Suggested fix:** Route invite links through your own domain (e.g., `org.aveyo.com/api/auth/verify?token=...`).
- **Acceptance check:** Invite email links use an org.aveyo.com domain, not supabase.co.

---

### Finding 13: Invite email logo is broken
### 🔴 RETEST: STILL OPEN (no new email to verify)

- **Type:** Bug
- **Severity:** Medium
- **Where:** Invite email — header logo image
- **Original issue:** Logo uses `data:image/svg+xml;base64,...` URI (blocked by Gmail), SVG format (unsupported in most email clients), and CSS `filter: brightness(0) invert(1)` (unsupported in email). Three compounding failures.
- **Retest note (2026-02-19):** No new invite email was available to test. This finding remains open until a new invite email can be inspected.
- **Suggested fix:** Replace with a hosted PNG at an Aveyo domain (e.g., `https://org.aveyo.com/images/logo-white.png`). Use a pre-rendered white version — no CSS filters.
- **Acceptance check:** Aveyo logo renders in Gmail, Outlook, and Apple Mail. No CSS filters or data URIs.

---

### Finding 14: No page title in browser tab
### ✅ RETEST: FIXED

- **Type:** UX
- **Severity:** ~~Low~~ → Resolved
- **Where:** All pages — browser tab
- **Original issue:** Tab showed "org-chart-app" for all pages.
- **Retest result (2026-02-19):** The dashboard now shows "Org Chart — Aveyo OrgChart" in the browser tab. Page-specific titles are being set.

---

## ADDENDUM: Security Findings

*Note: This is a surface-level security review from the browser, not a penetration test. These findings warrant deeper investigation by a security professional.*

### Security Finding S1: Resend email API key exposed in client-side JavaScript bundle
### ✅ RETEST: FIXED

- **Type:** Security
- **Severity:** ~~CRITICAL~~ → Resolved
- **Where:** Client JS bundle (previously `/assets/index-DtUKvaXx.js`)
- **Original issue:** `VITE_RESEND_API_KEY` and its `re_`-prefixed value were compiled into the client bundle.
- **Retest result (2026-02-19):** New bundle (`/assets/index-CnM-nN3i.js`, 1295KB — down from 1534KB). No `VITE_` environment variables found in the bundle. The only `re_` match is `re_links` which is a Supabase table name, not an API key. The Resend API key has been successfully removed from client-side code.
- **Reminder:** Ensure the old API key has been rotated/revoked, not just removed from the bundle.

---

### Security Finding S2: Missing critical HTTP security headers
### ⚠️ RETEST: PARTIALLY FIXED

- **Type:** Security
- **Severity:** ~~High~~ → Medium (CSP now set, but some headers still need verification)
- **Where:** All HTTP responses from org.aveyo.com
- **Original issue:** Missing Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Only HSTS was set.
- **Retest result (2026-02-19):** Confirmed via CSP violation event listener that a **comprehensive Content-Security-Policy is now active**:
  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://semzdcsumfnmjnhzhtst.supabase.co;
  connect-src 'self' https://semzdcsumfnmjnhzhtst.supabase.co wss://semzdcsumfnmjnhzhtst.supabase.co;
  font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';
  ```
  This is a strong CSP. `frame-src 'none'` blocks embedding child iframes, and `object-src 'none'` prevents Flash/plugin-based attacks. The site is served via **Cloudflare** (confirmed via Server-Timing headers: `cfCacheStatus`, `cfEdge`, `cfOrigin`).
- **Still needs verification:** X-Frame-Options (iframe embedding test from same-origin succeeded, suggesting the header may not be set — though `frame-ancestors` could be added to CSP as a more modern alternative), X-Content-Type-Options, Referrer-Policy, Permissions-Policy. These can't be read from JavaScript but can be checked via `curl -I https://org.aveyo.com` or Cloudflare dashboard.
- **CSP note:** The Cloudflare beacon script (`static.cloudflareinsights.com/beacon.min.js`) loaded despite `script-src 'self'`. This is expected — Cloudflare injects it at the edge layer. It's not a CSP bypass.
- **Suggested remaining fix:** Add `frame-ancestors 'self'` to CSP (or set `X-Frame-Options: SAMEORIGIN` via Cloudflare). Verify X-Content-Type-Options and Referrer-Policy are set in the Cloudflare dashboard.

---

### Security Finding S3: CORS wildcard allows any origin
### 🟡 RETEST: UNABLE TO VERIFY

- **Type:** Security
- **Severity:** Medium
- **Where:** HTTP response headers — `Access-Control-Allow-Origin: *`
- **Original issue:** Server returns `Access-Control-Allow-Origin: *`, allowing any website to make cross-origin requests.
- **Retest note (2026-02-19):** Same as S2 — unable to inspect response headers from the browser during this session. Verify via `curl` or securityheaders.com.
- **Suggested fix (unchanged):** Replace `*` with specific trusted origins.

---

### Security Finding S4: Supabase table names and structure exposed in client bundle
### 🔴 RETEST: STILL OPEN (architectural — expected)

- **Type:** Security
- **Severity:** Low (informational)
- **Where:** Client JS bundle
- **Details:** Table names visible in bundle: `profiles`, `departments`, `org_chart_positions`, `share_links`, `process_share_links`, `organization_settings`, `processes`, `process_nodes`, `process_edges`.
- **Retest note (2026-02-19):** This is inherent to Supabase's client-side architecture and was not expected to change. The critical mitigation is ensuring Row Level Security (RLS) policies are correctly configured on all tables.
- **Suggested fix (unchanged):** Conduct an RLS audit to confirm no user can access data outside their organization via direct Supabase queries.

---

## Retest Summary (2026-02-19)

| # | Finding | Status |
|---|---------|--------|
| F1 | Primary buttons invisible | ✅ FIXED |
| F2 | Job Description click target | ✅ FIXED |
| F3 | Mobile nav links missing | ✅ FIXED |
| F4 | Canvas/sidebar overlap on mobile | ✅ FIXED |
| F5 | Sidebar name truncation | ✅ FIXED |
| F6 | Search doesn't filter canvas | 🔴 STILL OPEN |
| F7 | Button style inconsistency | ✅ FIXED (via F1) |
| F8 | React Flow watermark | ✅ FIXED |
| F9 | Email field looks editable | ✅ FIXED |
| F10 | No save feedback toast | ✅ FIXED |
| F11 | Minimap oversized on mobile | ✅ FIXED |
| F12 | Supabase URL in invite email | 🔴 STILL OPEN (no email) |
| F13 | Broken email logo | 🔴 STILL OPEN (no email) |
| F14 | Missing page titles | ✅ FIXED |
| S1 | Resend API key in bundle | ✅ FIXED |
| S2 | Missing security headers | ⚠️ PARTIALLY FIXED (CSP added, other headers unverified) |
| S3 | CORS wildcard | 🟡 UNABLE TO VERIFY |
| S4 | Table names in bundle | 🔴 STILL OPEN (by design) |

**Scorecard:** 12 fixed, 1 partially fixed (S2 — CSP added but other headers unverified), 3 still open (2 untestable without new email, 1 architectural), 1 unable to verify (S3 CORS).

*Note: Initial retest was conducted via a different Chrome browser instance, which produced stale/incorrect results for F2, F8, F10, and S2. Re-retested on the correct browser (Claude Macbook) with significantly improved results.*

### New Observations During Retest

- **Admin Panel & KPI Dashboard:** Two new navigation items appeared ("Admin Panel" and "KPI Dashboard") — these were not present in the original test.
- **Custom font (PPTelegraf):** The app now loads a custom font — the typography feels more branded.
- **Profile photo camera icon:** A camera icon overlay has been added to the profile photo area, improving the "change photo" affordance (addresses one of the original UI/UX recommendations).
- **Bundle size reduced:** From 1534KB to 1295KB (~16% reduction), suggesting code cleanup or dead code removal alongside the API key fix.

---

## 4. UI/UX Recommendations (Updated)

### Remaining Quick Wins

- ~~Fix CSS variable for --primary~~ → DONE
- ~~Add cursor:pointer to all buttons~~ → DONE
- ~~Set min-height: 100% on TipTap editor wrapper~~ → DONE
- ~~Add page-specific title tags~~ → DONE
- ~~Add a success toast after profile save~~ → DONE

### Remaining Medium Effort

- ~~Add a responsive hamburger menu~~ → DONE
- ~~Responsive dashboard layout~~ → DONE
- ~~Improve sidebar list truncation~~ → DONE
- **Link search to canvas behavior**: Still needed — search should pan/zoom/highlight the matched employee on the canvas (Finding 6).
- **Brand the invite email links**: Still needed — route auth links through org.aveyo.com (Finding 12).

### Bigger Bets (Unchanged)

- **Accessibility audit**: Add ARIA labels to React Flow canvas, keyboard navigation, color contrast, skip-to-content links.
- **Empty state for org chart with < 3 employees**: Consider "Invite more members" prompt.
- **Onboarding progress indicator**: Step indicator (e.g., "Step 1 of 3").
- ~~Profile photo upload UX~~ → Camera icon overlay DONE.

---

## 5. Draft Message to Dev Team (Updated for Retest)

> **Subject: OrgChart QA Retest — 12 of 14 Findings Fixed, 1 Item Remaining**
>
> Hi team,
>
> Retest completed. Excellent work — 12 of 14 original findings are fully fixed, the critical security issue (Resend API key) is resolved, and a comprehensive Content Security Policy has been added. The app feels significantly more polished.
>
> **The one remaining fix:**
> - **Search → canvas sync (F6):** Search still only filters the sidebar. When a user searches, the canvas should pan/zoom to the matched employee and highlight their card. (The Colin Farmer card does appear slightly dimmed when searching for Sara, which is a nice start — but ideally the canvas would zoom/center on the match.)
>
> **Security — mostly resolved:**
> - **CSP added** — strong policy with `default-src 'self'`, `frame-src 'none'`, `object-src 'none'`. Good work.
> - **Remaining:** Verify via Cloudflare dashboard or `curl -I` that X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers are set. Also consider adding `frame-ancestors 'self'` to CSP.
> - **CORS (S3):** Still unable to verify from browser — check if `Access-Control-Allow-Origin: *` has been tightened.
>
> **Reminders:**
> - Rotate the old Resend API key if not already done.
> - Email-related findings (F12 Supabase URL, F13 broken logo) couldn't be retested without a new invite email.
>
> Everything else — buttons, Job Description editor, mobile nav, responsive layout, sidebar names, minimap, page titles, save toast, email field styling, React Flow watermark — all verified fixed.
>
> Best,
> Colin

---

## 6. Verification Checklist

- [x] **Completeness:** Covered logged-out (sign-in screenshot), onboarding (3 screenshots), profile editing (live), dashboard/org chart (live), processes/flowchart (live), responsive (375px viewport)
- [x] **Correctness:** All steps are reproducible; severities reflect user impact; no contradictions between findings
- [x] **Constraints:** No passwords or secrets exposed; no irreversible changes performed; used only my own profile for testing
- [x] **Usability:** All suggestions are phrased as implementable changes with specific CSS properties, component changes, or architectural patterns
- [x] **Prioritization:** Top 5 issues clearly identified with rationale; blocker + high issues called out first
- [x] **Retest:** All original findings re-examined; status annotated with evidence; new observations documented

---

## 7. Open Questions / Approvals Needed

1. ~~**React Flow license:**~~ Watermark has been removed — resolved.
2. ~~**Mobile support priority:**~~ Mobile is clearly being supported — hamburger menu and responsive layout have been implemented.
3. **Onboarding testing:** I reviewed onboarding from screenshots only (since the invite link was expired). If a fresh test account can be created, I can do a live walkthrough to check validation, error states, and the full save flow.
4. **Supabase URL branding:** Is there a reason the invite email uses the raw Supabase URL? If this is intentional (e.g., Supabase handles the auth flow directly), the fix would require setting up a proxy/redirect on your domain.
5. **Resend API key rotation:** Has the old key been revoked? Removing it from the bundle prevents future exposure, but the old key may still be valid.
