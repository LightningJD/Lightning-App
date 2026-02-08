# 🎯 Premium Features - Implementation Guide

## ⚡ Current Status

**As of February 8, 2026:**

✅ **Feature Flag Infrastructure: READY**
❌ **Premium Features: NOT YET IMPLEMENTED**

The Lightning App currently has **NO pricing, subscriptions, or payment features**. All features are free and available to all users. This guide explains how to implement and gate premium features when you're ready to add monetization.

---

## 🚩 Feature Flag System

### Overview

The feature flag system allows you to:
- ✅ Build premium features without making them public
- ✅ Toggle features on/off with a single environment variable
- ✅ Test premium features in development
- ✅ Launch features when ready (no code deployment needed)

### Configuration

**1. Environment Variable:**
```bash
# .env.local
VITE_ENABLE_PREMIUM=false  # Hide premium features
VITE_ENABLE_PREMIUM=true   # Show premium features
```

**2. Feature Flag Utility:**
```typescript
// src/lib/featureFlags.ts
export const features = {
  premium: import.meta.env.VITE_ENABLE_PREMIUM === 'true',
};
```

---

## 🎨 How to Gate Premium Features

### 1. **UI Components** (React/TSX)

**Gate entire components:**
```tsx
import { features } from '@/lib/featureFlags';

function SettingsPage() {
  return (
    <div>
      {/* Always visible */}
      <ProfileSettings />
      <PrivacySettings />

      {/* Only visible when premium enabled */}
      {features.premium && (
        <SubscriptionSection />
      )}
    </div>
  );
}
```

**Gate specific elements:**
```tsx
{features.premium && (
  <button onClick={handleUpgrade}>
    Upgrade to Pro 💎
  </button>
)}
```

**Conditional rendering:**
```tsx
{features.premium ? (
  <PricingCard tier="pro" />
) : (
  <p>All features are currently free!</p>
)}
```

### 2. **API Routes / Server Functions**

**Early return pattern:**
```typescript
import { features } from '@/lib/featureFlags';

export async function checkSubscriptionTier(userId: string) {
  // If premium disabled, everyone is "free" tier
  if (!features.premium) {
    return 'free'; // Or skip tier checking entirely
  }

  // Premium enabled: perform actual tier check
  const subscription = await getSubscription(userId);
  return subscription.tier;
}
```

**Guard entire functions:**
```typescript
export async function processPayment(userId: string, amount: number) {
  if (!features.premium) {
    console.warn('Payment processing called but premium features disabled');
    return { success: false, reason: 'Premium features not enabled' };
  }

  // Actual payment processing
  return await stripe.createPayment({ userId, amount });
}
```

### 3. **Routes / Pages**

**Conditional route rendering:**
```tsx
import { features } from '@/lib/featureFlags';
import { Route } from 'react-router-dom';

function AppRoutes() {
  return (
    <>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<Profile />} />

      {/* Only register route if premium enabled */}
      {features.premium && (
        <>
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/billing" element={<BillingPage />} />
        </>
      )}
    </>
  );
}
```

**Or redirect if accessed:**
```tsx
function PricingPage() {
  if (!features.premium) {
    return <Navigate to="/" />;
  }

  return <PricingContent />;
}
```

### 4. **Navigation Menus**

**Hide menu items:**
```tsx
function SettingsMenu() {
  return (
    <menu>
      <MenuItem to="/settings/profile">Profile</MenuItem>
      <MenuItem to="/settings/privacy">Privacy</MenuItem>

      {features.premium && (
        <>
          <MenuItem to="/settings/subscription">Subscription</MenuItem>
          <MenuItem to="/settings/billing">Billing</MenuItem>
        </>
      )}
    </menu>
  );
}
```

---

## 📦 What Premium Features to Gate

When you implement monetization, gate these elements:

### Essential Gates

**1. Pricing Pages**
- `/pricing` route
- Pricing card components
- Tier comparison tables
- "See Plans" buttons

**2. Subscription Management**
- Subscription status displays
- Tier badges (Starter, Pro, etc.)
- Subscription settings page
- Plan upgrade/downgrade UI

**3. Payment Flows**
- Checkout pages
- Payment form components
- Stripe integration UI
- Payment success/failure pages

**4. Billing**
- Billing history page
- Invoice downloads
- Payment method management
- Billing settings

**5. Upgrade Prompts**
- "Upgrade to Pro" buttons
- Feature limit warnings
- Upsell modals/banners
- Premium feature teasers

**6. Feature Limits**
- Testimony count limits
- Storage limits
- API rate limits based on tier
- Premium-only features

### Database Considerations

**Keep schema, gate enforcement:**

```sql
-- Keep the column (future use)
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';

-- But don't enforce limits when flag is off
```

```typescript
export async function canCreateTestimony(userId: string) {
  if (!features.premium) {
    return true; // No limits when premium disabled
  }

  // Check tier limits when premium enabled
  const tier = await getUserTier(userId);
  const count = await getTestimonyCount(userId);

  return count < TIER_LIMITS[tier].testimonies;
}
```

---

## ✅ Testing Checklist

Before launching premium features:

### With `VITE_ENABLE_PREMIUM=false` (Default)

- [ ] No pricing pages accessible
- [ ] No subscription/billing in settings
- [ ] No upgrade prompts or buttons
- [ ] No premium badges or tier displays
- [ ] No payment forms visible
- [ ] All features work without restrictions
- [ ] No console errors about missing premium code

### With `VITE_ENABLE_PREMIUM=true` (Launch Mode)

- [ ] Pricing page loads correctly
- [ ] Subscription management works
- [ ] Payment flow completes successfully
- [ ] Tier limits enforced properly
- [ ] Upgrade prompts appear
- [ ] Billing history displays
- [ ] All premium UI elements visible

---

## 🚀 Launch Process

When ready to enable premium features:

### Development Environment
```bash
# .env.local
VITE_ENABLE_PREMIUM=true
```

Test thoroughly in dev.

### Production Environment

**Option A: Environment Variable (Recommended)**
```bash
# Cloudflare Pages Dashboard → Settings → Environment Variables
VITE_ENABLE_PREMIUM=true
```

Redeploy to apply.

**Option B: Code Change**
```typescript
// src/lib/featureFlags.ts
export const features = {
  premium: true, // Hard-coded to true
};
```

Push to git, auto-deploys.

---

## 📝 Example: Adding a Pricing Page

Here's a complete example of adding a pricing page with proper gating:

### 1. Create the Component

```tsx
// src/components/PricingPage.tsx
import { features } from '@/lib/featureFlags';
import { Navigate } from 'react-router-dom';

export function PricingPage() {
  // Redirect if premium not enabled
  if (!features.premium) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pricing-page">
      <h1>Choose Your Plan</h1>

      <div className="pricing-tiers">
        <PricingCard
          tier="Starter"
          price="$0"
          features={['5 testimonies', 'Basic features']}
        />

        <PricingCard
          tier="Pro"
          price="$9.99/mo"
          features={['Unlimited testimonies', 'Premium features']}
        />
      </div>
    </div>
  );
}
```

### 2. Add the Route

```tsx
// src/App.tsx
import { features } from '@/lib/featureFlags';

function App() {
  return (
    <Routes>
      {/* Always available */}
      <Route path="/" element={<Home />} />

      {/* Gated route */}
      {features.premium && (
        <Route path="/pricing" element={<PricingPage />} />
      )}
    </Routes>
  );
}
```

### 3. Add Navigation Link

```tsx
// src/components/Header.tsx
{features.premium && (
  <NavLink to="/pricing">
    Pricing 💎
  </NavLink>
)}
```

### 4. Add Upgrade Prompt

```tsx
// src/components/TestimonyList.tsx
export function TestimonyList({ testimonies }) {
  const canCreate = testimonies.length < 5; // Free tier limit

  return (
    <div>
      <h2>My Testimonies</h2>

      {/* Show limit warning with premium enabled */}
      {features.premium && !canCreate && (
        <div className="upgrade-prompt">
          <p>You've reached your limit of 5 testimonies.</p>
          <Link to="/pricing">
            <button>Upgrade to Pro for unlimited!</button>
          </Link>
        </div>
      )}

      {/* List testimonies */}
      {testimonies.map(t => <TestimonyCard key={t.id} {...t} />)}
    </div>
  );
}
```

---

## 🎓 Best Practices

### DO ✅

- **Keep all premium code** - Don't delete, just gate it
- **Test both states** - Verify flag on AND off
- **Use early returns** - Exit functions early if premium disabled
- **Gate at component level** - Hide entire sections, not just buttons
- **Document gated features** - Comment why something is gated

### DON'T ❌

- **Don't delete premium code** - You'll need it later
- **Don't forget routes** - Gate pages in routing too
- **Don't leave errors** - Handle premium-disabled gracefully
- **Don't half-gate** - If hiding pricing, hide ALL pricing
- **Don't forget API calls** - Gate server-side too

---

## 🔍 Finding Premium Code

When adding premium features, search for:

```bash
# Search for potential premium features
grep -r "pricing" src/
grep -r "subscription" src/
grep -r "upgrade" src/
grep -r "premium" src/
grep -r "tier" src/
grep -r "plan" src/
grep -r "stripe" src/
grep -r "payment" src/
grep -r "billing" src/
```

---

## 📖 Related Documentation

- `.env.example` - Environment variable template
- `src/lib/featureFlags.ts` - Feature flag implementation
- `README.md` - Setup instructions

---

## 🆘 Troubleshooting

**"Feature flag not working"**
- Check `.env.local` exists (not tracked by git)
- Verify exact value: `VITE_ENABLE_PREMIUM=true` (lowercase)
- Restart dev server after changing .env
- Check console: feature flags auto-log in dev mode

**"Premium features showing when they shouldn't"**
- Double-check `VITE_ENABLE_PREMIUM=false` in .env.local
- Search for hard-coded premium displays
- Verify all premium UI uses `features.premium`

**"Users seeing partial premium UI"**
- Gate entire sections, not just buttons
- Check navigation menus
- Verify routes are gated
- Look for feature limit warnings

---

## ✨ Summary

**Current State (Feb 2026):**
- ✅ Feature flag system ready
- ✅ Environment variables configured
- ✅ Utility functions created
- ❌ No premium features exist yet

**When You Add Premium:**
1. Build premium features with `features.premium` gates
2. Test with flag OFF (everything hidden)
3. Test with flag ON (everything visible)
4. Launch by changing env variable to `true`

**One variable. Complete control. 🎯**

---

*Last Updated: February 8, 2026*
*Feature Flag System: v1.0.0*
