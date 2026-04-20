# Aveyo Page Layout Guide

Reference doc for laying out any new page so it feels on-brand with the aveyo.com homepage. Use alongside `design-system.json` for exact token values.

---

## Overall Page Skeleton

Every page follows this outer structure:

```
<main>
  <Navbar />          ← fixed, transitions to floating glassmorphic pill on scroll
  <Hero />            ← always the first visual section
  <Section />         ← repeatable content blocks (details below)
  <Section />
  ...
  <Footer />          ← scenic CTA + house illustration + frosted info panel
</main>
```

The page background is `#F4F6F6` (pageShellBg). Individual sections override this with their own surface color (typically `#FFFFFF`).

---

## Content Width

| Context | Max Width | Notes |
|---|---|---|
| Full-bleed sections | viewport (no max) | Hero, parallax, carousels |
| Standard content | **1240px** | Most section headings, card grids, text |
| Narrow prose | 700–760px | Centered body copy, descriptions |
| Footer CTA text | 1200px | Footer headline area |
| Horizontal padding | 20px (`px-5`) | Applied at section or inner wrapper level |

Always center content horizontally with `mx-auto`.

---

## Section Vertical Spacing

Sections alternate between generous vertical padding to give each block room to breathe.

| Spacing Tier | Value | When to Use |
|---|---|---|
| **Tight** | `py-5` (20px) | Card-row sections where cards provide their own internal padding |
| **Standard** | `py-20` / `py-28` (80px / 112px) | Most content sections (pricing, testimonials, FAQ) |
| **Dramatic** | `py-[160px]` | Before/after statement sections or between major thematic shifts |
| **Full viewport** | `min-h-screen` | Hero only |

The homepage rhythm is: **full-screen hero → dramatic gap → standard sections → dramatic gap → full-screen parallax → standard sections → footer**.

Between card rows within a section use `gap-5` (20px).

---

## Section Types & Layouts

### 1. Full-Screen Hero

The opening statement. Always viewport-height with media background.

- **Height:** `min-h-screen`
- **Background:** Full-bleed video or image with a radial/linear gradient overlay for text contrast
- **Content alignment:** Left-aligned, positioned at `pt-[30vh]` from top
- **Content width:** `max-w-[656px]` for the text column
- **Text stack:** Headline → subtitle → CTA buttons, separated by `gap-[50px]`
- **Bottom bar:** Trust badges (left) + testimonial mini-card (right) anchored to the bottom
- **Outer container:** `max-w-[1920px] mx-auto px-8`

```
┌─────────────────────────────────────────────────┐
│ [video/image background + gradient overlay]     │
│                                                 │
│   ← Headline (H1, 95px)                        │
│   ← Subtitle (H4, 32px)                        │
│   ← [CTA Button] [CTA Button]                  │
│                                                 │
│                                                 │
│ [trust badge]                   [testimonial]   │
└─────────────────────────────────────────────────┘
```

### 2. Section Heading + Carousel

Used for lifestyle imagery and benefit showcases.

- **Heading:** Left-aligned H2 inside `max-w-[1200px] mx-auto`, with `mb-[70px]` before the carousel
- **Carousel:** Full-width overflow, slides centered in viewport
- **Slide dimensions:** 885px–1200px wide, 545px–610px tall (responsive)
- **Slide gap:** 20px
- **Slide shape:** Rounded cards (`border-radius: 10px`)
- **Slide content:** Image/video background with gradient overlay, text bottom-left at `p-[70px]`
- **Navigation:** Glassmorphic pill with dot indicators, centered below

```
┌─────────────────────────────────────────────────┐
│  Section Heading (H2, 70px)                     │
│  left-aligned, 1200px container                 │
│                                                 │
│     ┌──────────────────────────┐                │
│  ◄──│    [active slide]        │──►             │
│     │    bg image/video        │                │
│     │                          │                │
│     │  Title (bold 18px)       │                │
│     │  Description (16px)      │                │
│     └──────────────────────────┘                │
│              (● ● ●)                            │
└─────────────────────────────────────────────────┘
```

### 3. Stacked Card Rows

For combining multiple visual blocks within one section.

- **Section padding:** `px-5 py-5`
- **Row gap:** `gap-5` (20px)
- **Cards:** All use `border-radius: 10px`
- **Row types:**
  - **Full-width showcase:** 100vh tall, centered text over gradient background, optional floating elements
  - **Carousel row:** 545px tall, same carousel pattern as above
  - **Image grid:** 2-column (`lg:grid-cols-2`), each card 545px tall, images as `object-cover`

```
┌─────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────┐ │
│ │  Full-width showcase card (100vh)           │ │
│ │  centered H2 + large stat + imagery         │ │
│ └─────────────────────────────────────────────┘ │
│                   20px gap                      │
│ ┌─────────────────────────────────────────────┐ │
│ │  Carousel row (545px)                       │ │
│ └─────────────────────────────────────────────┘ │
│                   20px gap                      │
│ ┌────────────────────┐ ┌────────────────────┐   │
│ │  Image card (545px)│ │  Image card (545px)│   │
│ └────────────────────┘ └────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 4. Centered Header + Card Grid

For pricing, features, or comparison content.

- **Header:** Centered within `max-w-[720px] mx-auto text-center`
  - H2 heading (clamp: 2.2rem–4.375rem)
  - Subtitle at H5 (24px) in muted gray, `mt-5`
  - `mb-12` / `mb-14` before the grid
- **Grid:** `grid-cols-1 lg:grid-cols-2`, `gap-5` or `gap-[30px]`
- **Cards:** Gradient background (`from-[#f4faff] to-[#d8d8d8]`), `border-radius: 10px`, `padding: 40px`
- **Card content:** Badge → title (H3) → subtitle → bullet lists → CTA buttons at bottom

```
┌─────────────────────────────────────────────────┐
│              Section Heading (H2)               │
│              Subtitle (H5, muted)               │
│                                                 │
│  ┌───────────────────┐  ┌───────────────────┐   │
│  │ [Badge]           │  │                   │   │
│  │ Plan Title (H3)   │  │ Plan Title (H3)   │   │
│  │ Subtitle          │  │ Subtitle          │   │
│  │                   │  │                   │   │
│  │ Benefits          │  │ Benefits          │   │
│  │ ✓ Item            │  │ ✓ Item            │   │
│  │ ✓ Item            │  │ ✓ Item            │   │
│  │                   │  │                   │   │
│  │ [CTA] [CTA]       │  │ [CTA] [CTA]       │   │
│  └───────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 5. Scroll-Animated Parallax

For brand storytelling moments with high visual impact.

- **Total scroll height:** `300vh` (the scroll distance drives the animation)
- **Sticky viewport:** `sticky top-0 h-screen` container holds the media
- **Media:** Full-bleed video
- **Mask/overlay:** SVG brand glyph or shape, white covers framing the cutout
- **Post-animation content:** Centered text block (`max-w-[1200px]`) that overlaps the sticky area with negative margin
- **Below that:** 2-column stat/value cards with gradient backgrounds, `gap-5`

```
┌─────────────────────────────────────────────────┐
│ [sticky full-screen video]                      │
│                                                 │
│        ┌──────────────────┐                     │
│        │  A-glyph cutout  │ ← scrolls & scales │
│        └──────────────────┘                     │
│                                                 │
│─── post-scroll content (overlapping) ───────────│
│              Heading (H2, centered)             │
│              Subtitle (H5)                      │
│              Body text (max-w-700)              │
│                                                 │
│  ┌───────────────────┐  ┌───────────────────┐   │
│  │   Stat Card       │  │   Stat Card       │   │
│  │   gradient bg     │  │   gradient bg     │   │
│  └───────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 6. Dark Statement Section

For high-contrast callouts like myth-busting or key messages.

- **Outer padding:** `px-5 pb-[160px]`
- **Container:** `max-w-[1880px] mx-auto`, `border-radius: 10px`, `px-[150px] py-[160px]`
- **Background:** Dark radial gradient (blue-gray to black)
- **Header:** Centered, large decorative number + H4 heading in white
- **Grid:** `md:grid-cols-3`, `gap-[100px]` on desktop
- **Items:** Icon (48px) → title (44px) → description (16px), all centered, white text

```
┌─────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐│
│  │ ■■■■■■■ dark gradient background ■■■■■■■■  ││
│  │                                             ││
│  │              3                              ││
│  │     Common Misconceptions                   ││
│  │        About Going Solar                    ││
│  │                                             ││
│  │  [icon]      [icon]      [icon]             ││
│  │  Title       Title       Title              ││
│  │  Desc        Desc        Desc               ││
│  │                                             ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### 7. Testimonials Carousel

Dedicated social-proof section.

- **Section padding:** `py-20 lg:py-28`
- **Header:** Centered, H4 heading + muted subtitle, `mb-12`/`mb-16`
- **Carousel:** Full-width, 1–3 visible cards (responsive), cards peek from edges
- **Card dimensions:** ~400px wide (responsive), 460–580px tall
- **Card surface:** Light gray (`#F9F9F9`), gradient border, subtle shadow
- **Card padding:** 40px (card-padding token)
- **Card content:** Avatar + name + location → star rating → quote text
- **Navigation:** Same glassmorphic pill as other carousels

### 8. Sub-page Sections (via page-kit.tsx)

For non-homepage pages, use the `SitePageShell`, `SiteHero`, `SiteSection`, `SiteSplitSection` primitives.

- **SiteHero:** Navy background, noise texture overlay, 2-column layout (text left, image right), stat cards optional
- **SiteSection:** Standard single-column with optional eyebrow/title/description header, tone variants (light, cream, navy)
- **SiteSplitSection:** 2-column layout with text one side, visual the other, reversible
- **SiteCardGrid:** 2, 3, or 4 column card grid
- **SiteFaq:** Accordion-style Q&A with gradient-border details elements

---

## Typography Scale

All text uses **PP Telegraf** font family.

| Level | Size | Weight | Usage |
|---|---|---|---|
| H1 | 95px | Regular (400) | Hero headline only. One per page. |
| H2 | 70px | Regular (400) | Section headings. |
| H3 | 52px | Regular (400) | Card/slide titles, plan names |
| H4 | 32px | Regular (400) | Sub-headings, testimonial section titles |
| H4 Mobile | 24px | Ultrabold (800) | Smaller breakpoint heading variant |
| H5 | 24px | Regular (400) | Card headings, subtitles, description emphasis |
| H6 | 18px | Regular (400) | List items, body emphasis |
| H7 | 16px | Regular (400) | Buttons, small body text |
| Paragraph | 13px | Regular (400) | Captions, labels, fine print |
| Body | 16px | Regular (400) | Standard body copy |
| Body Large | 20px | Regular (400) | Lead paragraphs, hero descriptions |
| Medium Bold | 18px | Ultrabold (800) | Slide labels, bold callouts |

**Line height:** Generally 1.5 for body, tighter (0.94–1.2) for headings, and 1.4–1.65 for descriptions.

**Responsive behavior:** Headings use `clamp()` or breakpoint-specific sizes (e.g., `text-[40px] sm:text-[55px] lg:text-[70px]`).

---

## Color Usage

| Role | Value | Where |
|---|---|---|
| Primary text | `#212120` (black) | Headings, body on light bg |
| White | `#FFFFFF` | Text on dark bg, card surfaces, buttons |
| Muted text | `#7D8081`, `#4C4E4E` | Subtitles, descriptions |
| Light bg | `#F4F4F4`, `#F9F9F9` | Card surfaces, alternating sections |
| Page shell bg | `#F4F6F6` | Full-page background |
| Gradient card bg | `#f4faff → #d8d8d8` | Pricing cards, stat cards |
| Blue tint | `#d9f0ff → #669bbc` | Savings hero gradient |
| Dark section bg | Radial `#6b92bc → #212120` | Statement/myth sections |
| Star rating | `#F0B046` | Testimonial stars |

---

## Button Styles

Two primary button variants, both pill-shaped:

| Variant | Background | Text | Radius |
|---|---|---|---|
| **Light** | `#FFFFFF` | `#000000` (bold) | 60px |
| **Dark** | `#212120` | `#FFFFFF` (bold) | 60px |

- **Padding:** 22px horizontal, 18px vertical
- **Font:** H7 (16px), bold/semibold
- **Arrow icon:** Always include a right-arrow SVG glyph after the label
- **Hover:** `opacity-90` transition

Buttons appear in pairs (primary + secondary) with `gap-5` (20px) between them.

---

## Card & Surface Treatment

### Standard Cards
- **Border radius:** 10px (consistent across all cards)
- **Padding:** 40px (card-padding token)
- **Background options:**
  - Solid white/light gray
  - Gradient: `linear-gradient(to bottom, #f4faff, #d8d8d8)`
  - Image-filled (object-cover, no internal padding)

### Glassmorphic Surfaces (Navbar, Carousel Nav, Hero Testimonials)
Applied to floating overlays and navigation pills:

1. **Backdrop blur:** 17–32px
2. **Background:** Semi-transparent layered gradient
   ```
   linear-gradient(90deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.08) 100%),
   linear-gradient(90deg, rgba(76,76,76,0.18) 0%, rgba(115,115,115,0.18) 49.5%, rgba(78,78,78,0.18) 100%)
   ```
3. **Noise texture:** `opacity-[0.06] mix-blend-overlay`, tiling at 424×424px
4. **Gradient border:** 0.9px border using CSS mask technique (white gradient, xor mask composite)

### Image Cards
- Always `border-radius: 10px` with `overflow-hidden`
- Images use `object-cover` and `fill` positioning
- Fixed heights: typically 545px on desktop
- Text overlays use gradient overlays for readability

---

## Image Usage Principles

| Pattern | Details |
|---|---|
| **Background media** | Full-bleed video/image behind text. Use dark gradient overlays for readability. |
| **Card imagery** | Image fills entire card (object-cover). Text floats on top with gradient. |
| **Grid images** | 2-column 50/50 split. Each image in its own rounded card. Equal height (545px). |
| **Floating elements** | Product images (solar panels) positioned absolutely with drop shadows. |
| **Decorative** | Brand glyphs, SVG masks, parallax effects for storytelling. |
| **Avatar stacks** | 43px circles, negative margin overlap (-10px), used for social proof. |
| **Footer illustration** | Full-width scenic image (house) with a fade-to-dark gradient at the bottom. |

Images are never used as small inline thumbnails on the homepage. They are always large, atmospheric, and section-defining.

---

## Carousel Pattern

Carousels share a consistent implementation:

- **Infinite loop:** Slides triplicated for seamless wrapping
- **Centering:** Active slide centered in viewport via `translateX(calc(50vw - halfWidth + offset))`
- **Transition:** 700ms cubic-bezier(0.33, 1, 0.68, 1) — ease-out-cubic
- **Inactive slides:** Visible on sides, text hidden (translateX + opacity 0)
- **Active slide text:** Animates in from right (translateX 220–340px → 0)
- **Navigation pill:** Glassmorphic, dot indicators (10px dot, 34px active bar), centered below

---

## Section Sequencing Guidelines

When creating a new page, follow this rhythm:

1. **Open with a Hero** — full-screen or tall hero with media, clear headline, and 1–2 CTAs
2. **Follow with the value proposition** — a carousel or stacked cards showing key benefits
3. **Present the details** — card grids or split sections for specifics (plans, features, process steps)
4. **Add a brand moment** — parallax, dark statement section, or full-bleed image break
5. **Include social proof** — testimonials carousel or customer quotes
6. **Optional: FAQ** — accordion section if the page warrants it
7. **Close with the Footer** — CTA headline + scenic illustration + frosted info panel

Alternate between light (`#FFFFFF`) and visual (gradient, dark, image) sections to maintain contrast and reading rhythm. Never stack two plain white text-heavy sections in a row without a visual break.

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| **< 640px** (mobile) | Single column, reduced font sizes, carousel 82–85vw slide width |
| **640–1024px** (tablet) | 2-column where applicable, carousel 70vw slide width |
| **1024–1280px** (desktop) | Full grid layouts, max content widths kick in |
| **1280px+** (wide) | 3-column testimonials, full nav links visible |
| **1920px** (max) | Hero container capped at 1920px |

---

## Quick Checklist for New Pages

- [ ] Uses `SitePageShell` (sub-pages) or `<main>` + `<Navbar>` + `<Footer>` (homepage-style)
- [ ] Hero section is the first thing after the navbar
- [ ] All headings use the PP Telegraf type scale
- [ ] Card border-radius is 10px everywhere
- [ ] Button border-radius is 60px (pill)
- [ ] Content is max 1240px wide, centered
- [ ] Sections have adequate vertical breathing room (80–160px)
- [ ] No two consecutive plain-white text sections without a visual break
- [ ] Images are large and atmospheric, never small inline thumbnails
- [ ] Footer includes a CTA config (title, description, action)
- [ ] Glassmorphic treatment applied only to floating/overlay elements
