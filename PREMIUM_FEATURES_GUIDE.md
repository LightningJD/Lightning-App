# 🎯 Feature Flags - Implementation Guide

## ⚡ Current Status

**As of February 8, 2026:**

✅ **Feature Flag Infrastructure: READY**
❌ **Premium Features: NOT YET IMPLEMENTED**
❌ **Upper Room Features: NOT YET IMPLEMENTED**

The Lightning App currently has:
- **NO pricing, subscriptions, or payment features** - All features are free
- **NO Upper Room features** - Prayer requests, connections not built yet

This guide explains how to implement and gate these features when you're ready to add them.

---

## 🚩 Feature Flag System

### Overview

The feature flag system allows you to:
- ✅ Build features without making them public
- ✅ Toggle features on/off with a single environment variable
- ✅ Test features in development
- ✅ Launch features when ready (no code deployment needed)

### Configuration

**1. Environment Variables:**
```bash
# .env.local
VITE_ENABLE_PREMIUM=false     # Hide premium/pricing features
VITE_ENABLE_UPPER_ROOM=false  # Hide Upper Room features
```

**2. Feature Flag Utility:**
```typescript
// src/lib/featureFlags.ts
export const features = {
  premium: import.meta.env.VITE_ENABLE_PREMIUM === 'true',
  upperRoom: import.meta.env.VITE_ENABLE_UPPER_ROOM === 'true',
};
```

---

## 🎨 How to Gate Features

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

      {/* Only visible when Upper Room enabled */}
      {features.upperRoom && (
        <PrayerSettings />
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

## 📦 What Features to Gate

When you implement these features, gate these elements:

### Premium Features (When Implemented)

**Essential Gates**

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

### Upper Room Features (When Implemented)

**Essential Gates**

**1. Upper Room Pages/Routes**
- `/upper-room` route
- Prayer request pages
- Prayer connection pages
- Prayer wall/feed pages
- "Upper Room" navigation items

**2. Prayer Request Features**
- Prayer request submission forms
- Prayer request display/feed
- Prayer request responses
- Prayer status updates
- Prayer request moderation

**3. Real-time Prayer Connections**
- Live prayer matching
- Real-time prayer notifications
- Prayer partner connections
- Prayer session UI
- Active prayer indicators

**4. Navigation & UI Elements**
- "Upper Room" tab/menu item
- Prayer-related navigation links
- Upper Room badges/icons
- Prayer notification badges
- Prayer activity indicators

**5. Settings**
- Prayer notification preferences
- Upper Room privacy settings
- Prayer connection controls
- Prayer request visibility options

**6. Prayer Features**
- Prayer counters/tracking
- Prayer history
- Prayer partner management
- Prayer testimonies
- Prayer analytics

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

Before launching features:

### Premium Features Testing

**With `VITE_ENABLE_PREMIUM=false` (Default)**

- [ ] No pricing pages accessible
- [ ] No subscription/billing in settings
- [ ] No upgrade prompts or buttons
- [ ] No premium badges or tier displays
- [ ] No payment forms visible
- [ ] All features work without restrictions
- [ ] No console errors about missing premium code

**With `VITE_ENABLE_PREMIUM=true` (Launch Mode)**

- [ ] Pricing page loads correctly
- [ ] Subscription management works
- [ ] Payment flow completes successfully
- [ ] Tier limits enforced properly
- [ ] Upgrade prompts appear
- [ ] Billing history displays
- [ ] All premium UI elements visible

### Upper Room Features Testing

**With `VITE_ENABLE_UPPER_ROOM=false` (Default)**

- [ ] No Upper Room pages accessible
- [ ] No prayer request features in UI
- [ ] No Upper Room navigation items
- [ ] No prayer connection features visible
- [ ] No prayer-related settings
- [ ] All other features work normally
- [ ] No console errors about missing Upper Room code

**With `VITE_ENABLE_UPPER_ROOM=true` (Launch Mode)**

- [ ] Upper Room pages load correctly
- [ ] Prayer request submission works
- [ ] Prayer connections display properly
- [ ] Real-time prayer features function
- [ ] Prayer notifications work
- [ ] Upper Room navigation appears
- [ ] All Upper Room UI elements visible

---

## 🚀 Launch Process

When ready to enable features:

### Development Environment
```bash
# .env.local
VITE_ENABLE_PREMIUM=true      # Enable premium features
VITE_ENABLE_UPPER_ROOM=true   # Enable Upper Room features
```

Test thoroughly in dev. You can enable features independently.

### Production Environment

**Option A: Environment Variable (Recommended)**
```bash
# Cloudflare Pages Dashboard → Settings → Environment Variables
VITE_ENABLE_PREMIUM=true      # Enable premium features
VITE_ENABLE_UPPER_ROOM=true   # Enable Upper Room features
```

Redeploy to apply. Enable features independently as needed.

**Option B: Code Change**
```typescript
// src/lib/featureFlags.ts
export const features = {
  premium: true,      // Hard-coded to true
  upperRoom: true,    // Hard-coded to true
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

- **Keep all feature code** - Don't delete, just gate it
- **Test both states** - Verify flag on AND off for each feature
- **Use early returns** - Exit functions early if feature disabled
- **Gate at component level** - Hide entire sections, not just buttons
- **Document gated features** - Comment why something is gated
- **Enable independently** - Premium and Upper Room can launch separately

### DON'T ❌

- **Don't delete feature code** - You'll need it later
- **Don't forget routes** - Gate pages in routing too
- **Don't leave errors** - Handle feature-disabled gracefully
- **Don't half-gate** - If hiding a feature, hide ALL of it
- **Don't forget API calls** - Gate server-side too
- **Don't couple features** - Keep premium and Upper Room independent

---

## 🔍 Finding Feature Code

When adding features, search for:

### Premium Features
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

### Upper Room Features
```bash
# Search for potential Upper Room features
grep -r "upper room" src/ -i
grep -r "upperroom" src/ -i
grep -r "prayer request" src/ -i
grep -r "prayer connection" src/ -i
grep -r "prayer wall" src/ -i
grep -r "prayer partner" src/ -i
grep -r "pray for" src/ -i
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
- Verify exact value: `VITE_ENABLE_PREMIUM=true` or `VITE_ENABLE_UPPER_ROOM=true` (lowercase)
- Restart dev server after changing .env
- Check console: feature flags auto-log in dev mode

**"Premium features showing when they shouldn't"**
- Double-check `VITE_ENABLE_PREMIUM=false` in .env.local
- Search for hard-coded premium displays
- Verify all premium UI uses `features.premium`

**"Upper Room features showing when they shouldn't"**
- Double-check `VITE_ENABLE_UPPER_ROOM=false` in .env.local
- Search for hard-coded Upper Room displays
- Verify all Upper Room UI uses `features.upperRoom`

**"Users seeing partial feature UI"**
- Gate entire sections, not just buttons
- Check navigation menus
- Verify routes are gated
- Look for feature-specific warnings or prompts

---

## ✨ Summary

**Current State (Feb 2026):**
- ✅ Feature flag system ready
- ✅ Environment variables configured (VITE_ENABLE_PREMIUM, VITE_ENABLE_UPPER_ROOM)
- ✅ Utility functions created
- ❌ No premium features exist yet
- ❌ No Upper Room features exist yet

**When You Add Features:**

**Premium:**
1. Build premium features with `features.premium` gates
2. Test with flag OFF (everything hidden)
3. Test with flag ON (everything visible)
4. Launch by changing `VITE_ENABLE_PREMIUM=true`

**Upper Room:**
1. Build Upper Room features with `features.upperRoom` gates
2. Test with flag OFF (everything hidden)
3. Test with flag ON (everything visible)
4. Launch by changing `VITE_ENABLE_UPPER_ROOM=true`

**Two variables. Complete control. Independent launches. 🎯**

---

*Last Updated: February 8, 2026*
*Feature Flag System: v1.0.0*
