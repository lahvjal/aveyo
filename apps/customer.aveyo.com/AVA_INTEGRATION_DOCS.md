# Ava AI Chatbot Integration Documentation
## Customer Portal - Aveyo Solar

---

## 🤖 Overview

**Ava** is an AI-powered chatbot assistant integrated into the Aveyo Customer Portal to provide 24/7 support for customers about their solar projects, installation timelines, and general questions.

**Customer Embed Host:** https://ava-ai-chatbot.vercel.app

> Scope note: this document covers the **customer portal embed** only.  
> Internal support tooling at `ava.aveyo.com/ava` is a separate, support-only surface.

---

## 🔌 Integration Method

### Embedded Widget Approach

Ava is integrated as a **JavaScript embed widget** that loads on the dashboard page. It uses an authenticated session system to personalize the experience for each customer.

### Script Loading

**Location:** `/src/app/(dashboard)/dashboard/page.tsx`

```typescript
const avaEmbedScriptUrl = `${
  (process.env.NEXT_PUBLIC_CHATBOT_URL?.trim() || "https://ava-ai-chatbot.vercel.app").replace(/\/$/, "")
}/embed/ava-auth-embed.js`;

<Script
  src={avaEmbedScriptUrl}
  strategy="afterInteractive"
  onLoad={() => {
    setAvaScriptLoaded(true);
    // Initialize session
  }}
/>
```

**Loading Strategy:** `afterInteractive` - Loads after the page becomes interactive (not blocking)

---

## 🔐 Authentication & Session Management

### AvaAuth Global Object

Once the script loads, it exposes a global `window.AvaAuth` object with these methods:

```typescript
interface Window {
  AvaAuth: {
    setSession: (sessionData) => void;    // Set user session
    clearSession: () => void;             // Clear user session
    getSession: () => any;                // Get current session
    open: () => void;                     // Open chat widget
    close: () => void;                    // Close chat widget
    isOpen: () => boolean;                // Check if widget is open
  };
}
```

### Session Setup

When a user logs in, the dashboard automatically passes their authentication data to Ava:

```typescript
const setupAvaSession = (userData: any) => {
  if (typeof window !== 'undefined' && window.AvaAuth && userData?.email) {
    const sessionData = {
      email: userData.email,
      userId: userData.id,
      name: userData.user_metadata?.full_name || userData.email.split('@')[0],
      token: userData.access_token,
      customData: {
        loginTime: new Date().toISOString(),
        userType: 'customer',
        supabaseUserId: userData.id,
        platform: 'customer-portal'
      }
    };
    
    window.AvaAuth.setSession(sessionData);
  }
};
```

**What Gets Sent:**
- ✅ User email
- ✅ User ID (Supabase)
- ✅ User name
- ✅ Access token
- ✅ Custom metadata (login time, user type, platform)

This allows Ava to:
- Know who the customer is
- Access their project data
- Provide personalized responses
- Maintain context across conversations

---

## 🎯 User Entry Points

Ava can be accessed from **3 different places** in the portal:

### 1. Dashboard Banner (Primary CTA)

**Location:** Main dashboard page after project cards

```tsx
{/* Ava AI Chatbot CTA Banner */}
<div className="relative flex justify-center items-center rounded-lg shadow-lg p-6">
  <img src="/ava-logo2.svg" alt="Ava Logo" />
  <h2>Meet Ava, Your AI Solar Assistant!</h2>
  <p>Get instant answers about your solar project...</p>
  <button onClick={openAvaWidget}>
    Chat with Ava
  </button>
</div>
```

**Visual:**
- Large banner with purple gradient background
- Ava logo and branding
- Call-to-action button
- Descriptive text about Ava's capabilities

### 2. Support Tab (Navigation)

**Location:** `/src/components/layout/TabNavigation.tsx`

```tsx
const tabs = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/actions', label: 'Actions', badge: pendingActionsCount },
  { href: '/expectations', label: 'Expectations' },
  { label: 'Support', isButton: true, onClick: openAvaChat },
];
```

**Behavior:**
- Clicking "Support" tab opens Ava widget
- **Does NOT navigate to a new page**
- Tracked as `support_tab` in analytics

### 3. Chat Widget Icon (Always Visible)

The Ava embed script itself adds a persistent chat icon (typically in bottom-right corner) that users can click at any time.

---

## 📊 Analytics Tracking

### Events Tracked

**File:** `/src/lib/analytics.ts`

```typescript
// When Ava widget is opened
analytics.avaChatOpened('banner'); // From dashboard banner
analytics.avaChatOpened('support_tab'); // From support tab
```

**Tracking Locations:**
- Banner button click
- Support tab click
- Analytics help understand usage patterns

---

## 🔄 Lifecycle Flow

### 1. Page Load
```
User navigates to dashboard
    ↓
Next.js renders page
    ↓
Ava script loads (afterInteractive)
    ↓
Script sets up window.AvaAuth object
    ↓
onLoad callback fires
    ↓
setAvaScriptLoaded(true)
```

### 2. Session Setup
```
User is authenticated (Supabase)
    ↓
useEffect detects user + avaScriptLoaded
    ↓
Get session access_token from Supabase
    ↓
Call setupAvaSession(userData)
    ↓
window.AvaAuth.setSession(sessionData)
    ↓
Ava knows who the user is
```

### 3. User Interaction
```
User clicks "Chat with Ava" or "Support" tab
    ↓
window.AvaAuth.open() is called
    ↓
Ava widget appears on screen
    ↓
User can chat with personalized context
```

### 4. Logout
```
User logs out
    ↓
clearAvaSession() is called
    ↓
window.AvaAuth.clearSession()
    ↓
Session data removed
```

---

## 🛠️ Key Implementation Files

### 1. Dashboard Page (`dashboard/page.tsx`)
**Responsibilities:**
- Load Ava script
- Set up authenticated session
- Provide banner CTA
- Manage session state

**Key Functions:**
- `setupAvaSession()` - Pass user data to Ava
- `clearAvaSession()` - Clean up on logout
- `openAvaWidget()` - Open chat from banner

### 2. Tab Navigation (`TabNavigation.tsx`)
**Responsibilities:**
- Provide "Support" tab entry point
- Open Ava widget on click

**Key Functions:**
- `openAvaChat()` - Open chat from support tab

### 3. Analytics (`lib/analytics.ts`)
**Responsibilities:**
- Track Ava usage
- Monitor engagement

---

## 🎨 Visual Assets

### Logo Files
- `/public/ava-logo2.svg` - Full Ava logo (used in banner)
- `/public/ava-icon.svg` - Ava icon (used in buttons)

### Background
- `/public/background-color.png` - Banner background image

---

## 🔍 Debugging & Logs

### Console Logging

The integration includes extensive console logging for debugging:

```typescript
// Script load status
console.log('=== AVA SCRIPT LOADED ===');
console.log('Script loaded at:', new Date().toISOString());

// Session setup
console.log('=== SETTING UP AVA SESSION ===');
console.log('User email:', userData.email);
console.log('Session data being sent to Ava:', sessionData);

// Widget opening
console.log('=== BANNER BUTTON CLICKED ===');
console.log('AvaAuth exists:', !!(window.AvaAuth));
console.log('Opening Ava chat from banner button');
```

### Common Issues & Solutions

**Issue:** "Ava chatbot not available"
- **Cause:** Script hasn't loaded yet
- **Solution:** Wait for `avaScriptLoaded` state to be true

**Issue:** Session not set
- **Cause:** User not authenticated or script not loaded
- **Solution:** Check both `user` and `avaScriptLoaded` states

**Issue:** Widget doesn't open
- **Cause:** `window.AvaAuth.open()` called before initialization
- **Solution:** Add checks for `window.AvaAuth` existence

---

## 🔒 Security Considerations

### Data Passed to Ava
- ✅ User email (for identification)
- ✅ User ID (Supabase ID)
- ✅ Access token (for API authentication)
- ❌ **NO** passwords or sensitive financial data

### Session Clearing
- Session is cleared on logout
- Prevents unauthorized access
- Fresh session on each login

---

## 📱 Responsive Design

### Desktop
- Widget appears as overlay in bottom-right
- Banner is full-width

### Mobile
- Widget is full-screen when opened
- Banner is stacked vertically
- Touch-friendly buttons

---

## 🚀 Future Enhancements

### Potential Improvements
1. **Deep Links:** Open Ava with specific questions/contexts
2. **Proactive Messaging:** Ava initiates conversation based on user actions
3. **In-Page Integration:** Embed Ava directly in specific pages (e.g., Actions page)
4. **Offline Mode:** Queue messages when offline
5. **Multi-language:** Support for Spanish and other languages

### Data Integration Opportunities
- Pass current project status to Ava
- Send pending action items
- Share installation timeline
- Provide system production data (when available)

---

## 📞 Support & Maintenance

### Ava Platform
- **Customer embed host:** `NEXT_PUBLIC_CHATBOT_URL` (default `https://ava-ai-chatbot.vercel.app`)
- **Script URL:** `${NEXT_PUBLIC_CHATBOT_URL}/embed/ava-auth-embed.js`
- **Updates:** Automatically received when script is updated

### Portal Integration
- **Owner:** Customer Portal Team
- **Files to Monitor:**
  - `dashboard/page.tsx`
  - `TabNavigation.tsx`
  - `lib/analytics.ts`

---

## 🧪 Testing Checklist

- [ ] Script loads successfully
- [ ] Session is set on login
- [ ] Banner button opens widget
- [ ] Support tab opens widget
- [ ] Widget shows personalized greeting
- [ ] Session clears on logout
- [ ] Analytics events fire correctly
- [ ] Mobile responsive
- [ ] No console errors

---

## 📊 Usage Analytics

### Metrics to Track
1. **Widget Opens:** How often users open Ava
2. **Entry Points:** Banner vs Support tab vs widget icon
3. **Session Duration:** How long users chat
4. **Return Rate:** How many users return to Ava
5. **Questions Asked:** Types of questions customers have

### Current Tracking
```typescript
analytics.avaChatOpened('banner');      // Banner CTA
analytics.avaChatOpened('support_tab'); // Support tab
analytics.tabNavigation('support');     // Support tab click
```

---

## 💡 Best Practices

1. **Always check for script load:** Wait for `avaScriptLoaded` state
2. **Verify AvaAuth exists:** Check `window.AvaAuth` before calling methods
3. **Clear session on logout:** Prevent stale data
4. **Pass complete user context:** More data = better personalization
5. **Track usage:** Monitor analytics to improve experience

---

## 🔗 Quick Reference

| Action | Method | Example |
|--------|--------|---------|
| Open widget | `window.AvaAuth.open()` | `window.AvaAuth.open()` |
| Close widget | `window.AvaAuth.close()` | `window.AvaAuth.close()` |
| Set session | `window.AvaAuth.setSession(data)` | `window.AvaAuth.setSession({email, userId, token})` |
| Clear session | `window.AvaAuth.clearSession()` | `window.AvaAuth.clearSession()` |
| Check if open | `window.AvaAuth.isOpen()` | `if (window.AvaAuth.isOpen()) {...}` |

---

**Last Updated:** February 7, 2026  
**Integration Version:** v1.0  
**Ava Platform:** https://ava-ai-chatbot.vercel.app
