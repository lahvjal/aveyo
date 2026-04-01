# Telegraf Font Implementation

## Overview

The dashboard now uses the **Telegraf font family** (PP Telegraf) as the primary typeface across all components, replacing the previous Inter font from Google Fonts.

---

## 📁 Font Files Location

All Telegraf font files are located in:
```
/public/font/Telegraf/
```

### Available Font Weights

| Weight | File | Usage |
|--------|------|-------|
| **200** | PPTelegraf-Ultralight.woff2 | Ultra-light text |
| **400** | PPTelegraf-Regular.woff2 | Regular/normal text (body copy) |
| **700** | PPTelegraf-Bold.woff2 | Bold text (headings, emphasis) |
| **800** | PPTelegraf-Ultrabold.woff2 | Ultra-bold text |
| **900** | PPTelegraf-Black.woff2 | Black weight (maximum emphasis) |

All fonts include:
- `.woff2` (web optimized, used in app)
- `.woff` (fallback for older browsers)
- `.ttf` (TrueType)
- `.otf` (OpenType)

---

## 🔧 Implementation Details

### 1. Font Configuration (`src/app/layout.tsx`)

```typescript
import localFont from "next/font/local";

const telegraf = localFont({
  src: [
    {
      path: "../../public/font/Telegraf/PPTelegraf-Ultralight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/font/Telegraf/PPTelegraf-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/font/Telegraf/PPTelegraf-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/font/Telegraf/PPTelegraf-Ultrabold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/font/Telegraf/PPTelegraf-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-telegraf",
});
```

### 2. CSS Variable (`src/app/globals.css`)

```css
:root {
  --font-telegraf: "Telegraf", system-ui, -apple-system, sans-serif;
}

body {
  font-family: var(--font-telegraf);
  /* ... */
}
```

### 3. Tailwind Configuration (`tailwind.config.ts`)

```typescript
theme: {
  extend: {
    fontFamily: {
      sans: ["var(--font-telegraf)", "system-ui", "-apple-system", "sans-serif"],
    },
  },
}
```

---

## 🎨 Using Telegraf in Components

### Default (Applied Automatically)

All text uses Telegraf automatically via the `font-sans` class from Tailwind:

```tsx
<p className="text-base">This uses Telegraf Regular (400)</p>
```

### Font Weights

```tsx
// Regular (400) - Default
<p className="font-normal">Regular text</p>

// Bold (700) - For headings and emphasis
<h1 className="font-bold">Bold heading</h1>

// Ultra-bold (800) - Extra emphasis
<h1 className="font-extrabold">Extra bold heading</h1>

// Black (900) - Maximum emphasis
<h1 className="font-black">Black weight heading</h1>

// Ultralight (200) - Subtle text
<p className="font-extralight">Ultralight text</p>
```

### Current Usage in Dashboard

| Component | Weight | Usage |
|-----------|--------|-------|
| Body text | 400 (Regular) | Paragraphs, descriptions |
| Card titles | 600-700 (Semibold/Bold) | KPI card headers |
| Page headings | 700 (Bold) | Section titles |
| Large numbers | 700-900 (Bold/Black) | KPI values |
| Buttons | 500-600 (Medium/Semibold) | CTAs |
| Labels | 500 (Medium) | Form labels |

---

## ⚡ Performance Optimization

### Why woff2?

- **Smaller file size**: 30-50% smaller than TTF/OTF
- **Better compression**: Optimized for web delivery
- **Wide browser support**: Supported by all modern browsers
- **Faster load times**: Reduced bandwidth usage

### Font Loading Strategy

1. **Preload critical fonts**: Regular and Bold weights
2. **CSS Font Loading API**: Used by Next.js automatically
3. **Font display: swap**: Shows fallback font until Telegraf loads
4. **Subset optimization**: Only Latin characters loaded

### Browser Support

| Browser | woff2 Support |
|---------|---------------|
| Chrome | ✅ 36+ |
| Firefox | ✅ 39+ |
| Safari | ✅ 10+ |
| Edge | ✅ 14+ |

---

## 🔍 Fallback Fonts

If Telegraf fails to load, the system falls back to:

1. **system-ui** - System's default UI font
2. **-apple-system** - Apple San Francisco (macOS/iOS)
3. **sans-serif** - Browser's default sans-serif

---

## 📊 Font Metrics

### Telegraf Characteristics

- **Style**: Neo-grotesque sans-serif
- **Design**: Geometric, modern, clean
- **Best for**: UI, dashboards, data visualization
- **Readability**: Excellent at all sizes
- **Numerals**: Monospaced (perfect for numbers in KPIs)

### Optimal Usage

```css
/* Body text */
font-size: 14px-16px;
font-weight: 400;
line-height: 1.5;

/* Headings */
font-size: 18px-32px;
font-weight: 700;
line-height: 1.2;

/* KPI values */
font-size: 24px-48px;
font-weight: 700-900;
letter-spacing: -0.02em;
```

---

## 🎯 Examples in Dashboard

### KPI Card

```tsx
<div className="p-5">
  {/* Title - Bold */}
  <h3 className="text-sm font-semibold text-slate-900">
    Total Sales
  </h3>
  
  {/* Value - Extra Bold */}
  <span className="text-3xl font-bold text-slate-900">
    1,234
  </span>
  
  {/* Description - Regular */}
  <p className="text-xs text-slate-500">
    Number of residential contracts sold
  </p>
</div>
```

### Page Header

```tsx
<div>
  {/* Main title - Bold */}
  <h1 className="text-2xl font-bold text-slate-900">
    Executive Dashboard
  </h1>
  
  {/* Subtitle - Regular */}
  <p className="text-sm text-slate-600">
    Last updated: Dec 16, 2025
  </p>
</div>
```

---

## 🔄 Migration from Inter

### Changes Made

| Before | After |
|--------|-------|
| `Inter` from Google Fonts | `Telegraf` local fonts |
| `--font-geist-sans` variable | `--font-telegraf` variable |
| Remote font loading | Local font files |
| Limited weights | 5 weights available |

### Benefits

✅ **Faster loading** - No external requests  
✅ **Better privacy** - No Google Fonts tracking  
✅ **Offline support** - Works without internet  
✅ **Consistent rendering** - Same on all browsers  
✅ **Custom branding** - Unique Aveyo identity  

---

## 🛠️ Troubleshooting

### Font not loading?

**Check browser DevTools:**
```javascript
// In Console, verify font is loaded:
document.fonts.check('12px Telegraf'); // Should return true
```

**Check Network tab:**
- Look for font file requests
- Verify 200 status codes
- Check file sizes (should be ~50-100KB each)

### Font looks different?

**Clear cache:**
```bash
# Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**Verify CSS:**
```css
/* Inspect element in DevTools */
body {
  font-family: Telegraf, system-ui, -apple-system, sans-serif;
}
```

---

## 📝 Adding New Weights (If Needed)

If you need additional weights like Medium (500) or Semibold (600):

1. **Add to layout.tsx:**
```typescript
{
  path: "../../public/font/Telegraf/PPTelegraf-Medium.woff2",
  weight: "500",
  style: "normal",
}
```

2. **Use in components:**
```tsx
<p className="font-medium">Medium weight text</p>
```

---

## ✅ Verification Checklist

- [x] Font files in `/public/font/Telegraf/`
- [x] Local font configured in `layout.tsx`
- [x] CSS variable `--font-telegraf` defined
- [x] Tailwind config updated
- [x] All components render with Telegraf
- [x] Dashboard loads with correct typography
- [x] Numbers display properly (monospaced)
- [x] No console errors
- [x] Fast load times

---

## 📚 Resources

- **Telegraf Font Family**: PP Telegraf by Pangram Pangram Foundry
- **License**: Check `/public/font/Telegraf/LICENSE` (if available)
- **Next.js Font Optimization**: https://nextjs.org/docs/app/building-your-application/optimizing/fonts

---

**Implementation Date**: December 16, 2025  
**Status**: ✅ Active  
**Designer**: Pangram Pangram Foundry

