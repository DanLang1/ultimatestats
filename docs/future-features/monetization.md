# Monetization Strategy

> **Status**: Brainstorm / Future Feature

## Philosophy

The core scoreboard and basic stat tracking (goals/assists/turnovers) will remain **free forever**. Advanced features that require significant development effort will be offered as **one-time purchases** to support ongoing development.

---

## Pricing Model: One-Time Purchases

No subscriptions. Users pay once and own the feature forever.

| Tier             | Features                                                   | Price Range      |
| ---------------- | ---------------------------------------------------------- | ---------------- |
| **Free**         | Scoreboard, basic stats, roster, game history, data export | $0               |
| **Pro Features** | Advanced stat tracking, cloud sync                         | $5-15 (one-time) |

---

## Candidate Paid Features

### 1. Advanced Stat Tracking

> See: [field-stat-tracking.md](./field-stat-tracking.md)

- Full pass-by-pass tracking
- Active 7 player selection per point
- Voice input + tap grid hybrid
- Optional field location zones
- Advanced stats (completion %, touches, plus/minus)

**Access**: Settings → "Advanced Stat Tracking" → Dedicated screen

---

### 2. Cloud Sync & Team Sharing

> See: [cloud-sync.md](./cloud-sync.md)

- Sync games across devices
- Share team roster with co-coaches
- Upload games to cloud
- View aggregated stats across all team games

**Access**: Settings → "Sync to Cloud" → Requires account

---

### Free: Data Export & Reports

- Export game data as CSV/JSON
- Generate PDF game reports
- Season summary statistics

_(Included free - not paywalled)_

---

## Implementation Approach

### RevenueCat vs react-native-iap

| Factor                  | RevenueCat                               | react-native-iap                    |
| ----------------------- | ---------------------------------------- | ----------------------------------- |
| **Setup**               | Much simpler, handles edge cases         | More boilerplate, DIY edge cases    |
| **Receipt validation**  | Server-side, automatic                   | You build it yourself               |
| **Cross-platform sync** | Built-in (iOS purchase works on Android) | Manual implementation               |
| **Analytics**           | Dashboard with charts, cohorts, MRR      | None - build your own               |
| **Restore purchases**   | One-liner                                | Manual implementation               |
| **Price**               | Free up to $2.5k/mo revenue, then 1%     | Free (open source)                  |
| **Expo support**        | `expo-purchases` wrapper                 | `react-native-iap` works but quirky |

**Recommendation: RevenueCat**

- For a solo dev, the time savings are worth it
- Free tier covers you until you're making real money
- `expo-purchases` is the official Expo wrapper
- Handles all the annoying edge cases (interrupted purchases, family sharing, etc.)

```bash
npx expo install expo-purchases
```

### Feature Gating

```typescript
// Pseudocode for feature access
interface PurchasedFeatures {
  advancedStatTracking: boolean;
  cloudSync: boolean;
}

// Check before showing feature
if (!purchasedFeatures.advancedStatTracking) {
  showPaywall('advancedStatTracking');
}
```

### Paywall UI

When user tries to access a paid feature:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│           ⭐ Advanced Stat Tracking              │
│                                                  │
│   Track every pass between players with:        │
│   • Voice-to-text input                         │
│   • Active 7 player selection                   │
│   • Field location zones                        │
│   • Completion %, touches, plus/minus           │
│                                                  │
│            ┌─────────────────────┐               │
│            │   Unlock - $X.XX    │               │
│            └─────────────────────┘               │
│                                                  │
│              [Maybe Later]                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Pricing Considerations

- **App Store takes 30%** (15% for small business program)
- Price should feel fair for a utility app
- Consider regional pricing
- Free trial period? (e.g., 3 games with advanced tracking)

---

## Open Questions

1. **Bundle pricing?** - Discount for buying multiple features together?
2. **Free trial?** - Let users try advanced features for X games before purchase?
3. **Grandfathering?** - Early adopters get features free?
4. **Promo codes?** - For team captains, content creators, etc.?
