# App Color Theme Documentation

> **Theme Name:** Fresh Blue Modern Theme  
> **Last Updated:** January 2026

---

## 🎨 Brand Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Primary** | `#0077C0` | Vibrant Blue - Primary brand color |
| **Primary Dark** | `#005A94` | Darker blue for pressed states |
| **Primary Light** | `#3399D6` | Lighter blue for hover/active states |
| **Secondary** | `#1D242B` | Dark Charcoal - Secondary accents |
| **Accent** | `#C7EEFF` | Light Sky Blue - Accent color |
| **CTA** | `#0077C0` | Vibrant Blue - Call-to-action / Primary Buttons |

### Brand Color Palette Preview

```
Primary:        ████████████  #0077C0
Primary Dark:   ████████████  #005A94
Primary Light:  ████████████  #3399D6
Secondary:      ████████████  #1D242B
Accent:         ████████████  #C7EEFF
```

---

## 🖼️ Background & Surface Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Background** | `#FAFAFA` | Clean off-white background |
| **Background Pure** | `#FFFFFF` | Pure white when needed |
| **Background Off-White** | `#FAFAFA` | Off-white for modern screens |
| **Surface** | `#FFFFFF` | White surface / cards |
| **Surface Secondary** | `#F5F8FA` | Subtle blue-tinted gray for inactive states |
| **Surface Tertiary** | `#F5F8FA` | Additional surface color |
| **Surface Card** | `#FFFFFF` | Card background with shadow |
| **Accent Light** | `#C7EEFF` | Light blue tint for highlights |
| **Accent Lighter** | `#E3F6FF` | Softer sky blue for backgrounds |
| **Accent Soft** | `#F0FAFF` | Very soft blue tint for backgrounds |

---

## ✏️ Text Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Text** | `#1D242B` | Dark charcoal for excellent readability |
| **Text Primary** | `#1D242B` | Dark Charcoal - Primary text / headings |
| **Text Secondary** | `#5A6978` | Blue-gray for secondary text |
| **Text Tertiary** | `#8B97A6` | Lighter gray for hints |
| **Text Muted** | `#8B97A6` | Muted text color |
| **Text Disabled** | `#CBD5DC` | Disabled text state |
| **Text Black** | `#000000` | Pure black text color |

### Text Hierarchy

```
Primary Text:    ████████████  #1D242B  (Headings, important content)
Secondary Text:  ████████████  #5A6978  (Descriptions, subtext)
Tertiary Text:   ████████████  #8B97A6  (Hints, placeholders)
Disabled Text:   ████████████  #CBD5DC  (Inactive states)
```

---

## 🔲 UI Element Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Border** | `#E1E8ED` | Soft blue-tinted border |
| **Border Light** | `#F0F4F8` | Very light border |
| **Border Focus** | `#0077C0` | Blue border for focus states |
| **Disabled** | `#CBD5DC` | Disabled state |

---

## ⚠️ Status Colors

### Main Status Colors

| Status | Hex Code | Usage |
|--------|----------|-------|
| **Error** | `#E53935` | Modern red for errors |
| **Success** | `#00C853` | Fresh green for success |
| **Warning** | `#FF9800` | Warm orange for warnings |
| **Info** | `#0077C0` | Brand blue for informational messages |

### Status Light Colors (Backgrounds)

| Status | Hex Code | Usage |
|--------|----------|-------|
| **Success Light** | `#E8F5E9` | Success message backgrounds |
| **Error Light** | `#FFEBEE` | Error message backgrounds |
| **Warning Light** | `#FFF3E0` | Warning message backgrounds |
| **Info Light** | `#E3F6FF` | Info message backgrounds |

---

## 🏠 Property Card Specific

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Property Card BG** | `#FFFFFF` | Property card background |
| **Property Card Shadow** | `rgba(29, 36, 43, 0.08)` | Subtle shadow with brand color |

---

## 🌑 Overlay Colors

| Color Name | Value | Usage |
|------------|-------|-------|
| **Overlay** | `rgba(29, 36, 43, 0.6)` | Overlay for modals |
| **Overlay Light** | `rgba(29, 36, 43, 0.3)` | Lighter overlay |

---

## 📐 Spacing Scale

| Name | Value | Usage |
|------|-------|-------|
| **xs** | `4px` | Extra small spacing |
| **sm** | `8px` | Small spacing |
| **md** | `16px` | Medium spacing (default) |
| **lg** | `24px` | Large spacing |
| **xl** | `32px` | Extra large spacing |
| **xxl** | `48px` | Double extra large spacing |
| **xxxl** | `64px` | Triple extra large spacing |

---

## 🔤 Typography Scale

| Style | Font Size | Weight | Line Height | Letter Spacing |
|-------|-----------|--------|-------------|----------------|
| **H1** | 32px | 700 (Bold) | 40px | -0.5 |
| **H2** | 22px | 700 (Bold) | 30px | -0.3 |
| **H3** | 18px | 600 (Semi-Bold) | 26px | - |
| **Body** | 16px | 400 (Regular) | 24px | - |
| **Body Large** | 18px | 400 (Regular) | 28px | - |
| **Body Semibold** | 16px | 600 (Semi-Bold) | 24px | - |
| **Caption** | 14px | 400 (Regular) | 20px | - |
| **Caption Semibold** | 14px | 600 (Semi-Bold) | 20px | - |
| **Small** | 12px | 400 (Regular) | 16px | - |
| **Price** | 20px | 700 (Bold) | 28px | - |

---

## 📦 Border Radius

| Name | Value | Usage |
|------|-------|-------|
| **xs** | `4px` | Minimal rounding |
| **sm** | `6px` | Small elements |
| **md** | `10px` | Medium elements (default) |
| **lg** | `14px` | Large elements |
| **xl** | `20px` | Extra large elements |
| **xxl** | `24px` | Double extra large |
| **round** | `9999px` | Fully rounded (pills, avatars) |

---

## 🌫️ Shadow Presets

### Card Shadow
```javascript
{
  shadowColor: '#1D242B',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
}
```

### Card Hover Shadow
```javascript
{
  shadowColor: '#1D242B',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 5,
}
```

### Button Shadow
```javascript
{
  shadowColor: '#0077C0',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 4,
}
```

### Subtle Shadow
```javascript
{
  shadowColor: '#1D242B',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
}
```

---

## 📁 File Location

All theme values are defined in:
```
src/theme/colors.ts
```

Exported from:
```
src/theme/index.ts
```

---

## 💡 Usage Example

```typescript
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Using colors
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    ...typography.h1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    ...shadows.button,
  },
});
```

---

## 🎯 Design Principles

1. **Clean & Fresh**: Off-white backgrounds with subtle blue tints create a modern, fresh feel
2. **Accessible**: High contrast text colors ensure excellent readability
3. **Consistent**: Blue-based accent colors maintain brand consistency throughout
4. **Hierarchical**: Clear text hierarchy guides user attention
5. **Responsive**: Shadow system provides depth without being heavy

---

## 📱 Dashboard Component Color Details

### Buyer Dashboard (`BuyerDashboardScreen.tsx`)

#### Container & Layout
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Main Container | `backgroundColor` | Off-white | `#FAFAFA` |
| Scroll Content | `backgroundColor` | Off-white | `#FAFAFA` |

#### Welcome Section
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Welcome Title | `color` | Text Primary | `colors.text` → `#1D242B` |
| Welcome Subtitle | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |

#### Search Section
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Search Container | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Search Input | `color` | Text Primary | `colors.text` → `#1D242B` |
| Placeholder Text | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Search Button | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Search Button Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Map Search Button | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Map Search Text | `color` | Text Primary | `colors.text` → `#1D242B` |

#### Toggle Buttons (All / Buy / Rent / PG)
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Inactive Toggle | `backgroundColor` | Accent Lighter | `colors.accentLighter` → `#E3F6FF` |
| Active Toggle | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Inactive Text | `color` | Text Primary | `colors.text` → `#1D242B` |
| Active Text | `color` | White | `colors.surface` → `#FFFFFF` |

#### Section Headers
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Section Title | `color` | Text Primary | `colors.text` → `#1D242B` |
| Section Subtitle | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| "See All" Link | `color` | Primary Blue | `colors.primary` → `#0077C0` |

#### City Cards
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| City Card Container | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| City Name | `color` | Text Primary | `colors.text` → `#1D242B` |

#### Loading & Empty States
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Activity Indicator | `color` | Primary Blue | `colors.primary` → `#0077C0` |
| Loading Text | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Empty Text | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Error Title | `color` | Text Primary | `colors.text` → `#1D242B` |
| Error Description | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |

---

### Seller Dashboard (`SellerDashboardScreen.tsx`)

#### Container & Layout
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Main Container | `backgroundColor` | Off-white | `#FAFAFA` |

#### Welcome Header Box
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Header Box | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Greeting Text | `color` | Dark Charcoal | `#1D242B` |
| Subtitle Text | `color` | Gray | `#6B7280` |
| Add Property Button | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Add Property Button Text | `color` | White | `colors.surface` → `#FFFFFF` |

#### Statistics Cards (2x2 Grid)
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Stat Card | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Stat Icon Container | `backgroundColor` | Info Light | `#E3F6FF` |
| Stat Number | `color` | Dark Charcoal | `#1D242B` |
| Stat Label | `color` | Gray | `#6B7280` |
| Active Badge | `backgroundColor` | Success Light | `#D1FAE5` |
| Active Badge Text | `color` | Green | `#059669` |
| New Badge | `backgroundColor` | Error Light | `#FEE2E2` |
| New Badge Text | `color` | Red | `#DC2626` |

#### Status Pills
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Sale Pill | `backgroundColor` | Light Blue | `#E3F6FF` |
| Rent Pill | `backgroundColor` | Light Orange | `#FEF3C7` |
| Pill Text | `color` | Primary Blue | `colors.primary` → `#0077C0` |

#### Quick Action Cards
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Quick Action Card | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Icon Container | `backgroundColor` | Info Light | `#E3F6FF` |
| Action Title | `color` | Dark Charcoal | `#1D242B` |
| Action Description | `color` | Gray | `#6B7280` |

#### Section Headers
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Section Icon Container | `backgroundColor` | Light Blue | `#E3F6FF` |
| Section Title | `color` | Dark Charcoal | `#1D242B` |
| Section Badge | `backgroundColor` | Error Light | `#FEE2E2` |
| Section Badge Text | `color` | Red | `#DC2626` |
| View All Button | `backgroundColor` | Light Blue | `#E3F6FF` |
| View All Text | `color` | Primary Blue | `colors.primary` → `#0077C0` |

#### Property Cards
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Property Card | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Image Placeholder | `backgroundColor` | Light Gray | `#F3F4F6` |
| For Sale Badge | `backgroundColor` | Success Green | `colors.success` → `#00C853` |
| For Rent Badge | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Badge Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Property Title | `color` | Dark Charcoal | `#1D242B` |
| Location Icon Container | `backgroundColor` | Light Blue | `#E3F6FF` |
| Location Text | `color` | Gray | `#6B7280` |
| Stats Divider | `borderTopColor` | Light Gray | `#F3F4F6` |
| Stat Icon Container | `backgroundColor` | Light Blue | `#E3F6FF` |
| Stat Text | `color` | Gray | `#6B7280` |
| Price | `color` | Primary Blue | `colors.primary` → `#0077C0` |

#### Inquiry Cards
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Inquiry Card | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Avatar Placeholder | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Avatar Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Buyer Name | `color` | Dark Charcoal | `#1D242B` |
| Inquiry Time | `color` | Light Gray | `#9CA3AF` |
| Property Title | `color` | Primary Blue | `colors.primary` → `#0077C0` |
| Message Text | `color` | Gray | `#6B7280` |

#### Empty State
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Empty State Container | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Empty State Container | `borderColor` | Light Gray | `#E5E7EB` |
| Icon Container | `backgroundColor` | Light Blue | `#E3F6FF` |
| Empty Title | `color` | Dark Charcoal | `#1D242B` |
| Empty Description | `color` | Gray | `#6B7280` |
| Empty Button | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Empty Button Text | `color` | White | `colors.surface` → `#FFFFFF` |

---

### Agent Dashboard (`AgentDashboardScreen.tsx`)

#### Container & Layout
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Main Container | `backgroundColor` | Off-white | `#FAFAFA` |

#### Agent Header (Image Background)
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Overlay | `backgroundColor` | Dark Overlay | `rgba(0, 0, 0, 0.4)` |
| Greeting Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Subtitle Text | `color` | White (90% opacity) | `colors.surface` + opacity |
| Add Property Button | `backgroundColor` | Accent Sky Blue | `colors.accent` → `#C7EEFF` |
| Add Property Button Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Add Project Button | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Add Project Button Text | `color` | White | `colors.surface` → `#FFFFFF` |

#### Statistics Cards
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Stat Card | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Stat Card | `borderColor` | Border | `colors.border` → `#E1E8ED` |
| Stat Number | `color` | Text Primary | `colors.text` → `#1D242B` |
| Stat Label | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Active Badge | `backgroundColor` | Success Green | `colors.success` → `#00C853` |
| Active Badge Text | `color` | White | `colors.surface` → `#FFFFFF` |
| New Badge | `backgroundColor` | Error Red | `colors.error` → `#E53935` |
| New Badge Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Positive Indicator | `backgroundColor` | Success Green | `colors.success` → `#00C853` |
| Negative Indicator | `backgroundColor` | Error Red | `colors.error` → `#E53935` |
| Active Indicator | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |

#### Status Pills
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Sale Pill | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Rent Pill | `backgroundColor` | Accent/Orange | `colors.accent` / `#FF9800` |
| Pill Text | `color` | White | `colors.surface` → `#FFFFFF` |

#### Quick Action Cards
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Quick Action Card | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Quick Action Card | `borderColor` | Border | `colors.border` → `#E1E8ED` |
| Action Title | `color` | Text Primary | `colors.text` → `#1D242B` |
| Action Description | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |

#### Section Headers
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Section Title | `color` | Text Primary | `colors.text` → `#1D242B` |
| Section Badge | `backgroundColor` | Error Red | `colors.error` → `#E53935` |
| Section Badge Text | `color` | White | `colors.surface` → `#FFFFFF` |
| View All Text | `color` | Primary Blue | `colors.primary` → `#0077C0` |

#### Property Cards
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Property Card | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Property Card | `borderColor` | Border | `colors.border` → `#E1E8ED` |
| Image Placeholder | `backgroundColor` | Border | `colors.border` → `#E1E8ED` |
| For Sale Badge | `backgroundColor` | Success Green | `colors.success` → `#00C853` |
| For Rent Badge | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Upcoming Project Badge | `backgroundColor` | Accent/Orange | `colors.accent` / `#FF9800` |
| Badge Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Property Title | `color` | Text Primary | `colors.text` → `#1D242B` |
| Location Text | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Stats Divider | `borderTopColor` | Border | `colors.border` → `#E1E8ED` |
| Stat Text | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Price | `color` | Primary Blue | `colors.primary` → `#0077C0` |

#### Inquiry Cards
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Inquiry Card | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Inquiry Card | `borderColor` | Border | `colors.border` → `#E1E8ED` |
| Avatar Placeholder | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Avatar Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Buyer Name | `color` | Text Primary | `colors.text` → `#1D242B` |
| Inquiry Time | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Property Title | `color` | Text Primary | `colors.text` → `#1D242B` |
| Message Text | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |

#### Empty State
| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Empty State Container | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Empty State Container | `borderColor` | Border | `colors.border` → `#E1E8ED` |
| Empty Text | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Empty Button | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Empty Button Text | `color` | White | `colors.surface` → `#FFFFFF` |

---

## 🧭 Header Components Color Details

### Buyer Header (`BuyerHeader.tsx`)

| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Safe Area / Header | `backgroundColor` | Background Off-white | `colors.background` → `#FAFAFA` |
| Header Border | `borderBottomColor` | Transparent Dark | `rgba(29, 36, 43, 0.08)` |
| Shadow (iOS) | `shadowColor` | Secondary Dark | `colors.secondary` → `#1D242B` |
| Add Property Button | `backgroundColor` | Secondary Dark | `colors.secondary` → `#1D242B` |
| Add Property Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Menu Button | `backgroundColor` | Transparent Dark | `rgba(29, 36, 43, 0.08)` |
| Hamburger Lines | `backgroundColor` | Secondary Dark | `colors.secondary` → `#1D242B` |
| Hamburger Lines (Active) | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Modal Overlay | `backgroundColor` | Dark Overlay | `rgba(0, 0, 0, 0.4)` |
| Menu Container | `backgroundColor` | Pure White | `#FFFFFF` |
| Menu Item Text | `color` | Text Primary | `colors.text` → `#1D242B` |
| Menu Divider | `backgroundColor` | Light Gray | `#F3F4F6` |
| Logout Text | `color` | Red | `#EF4444` |

### Seller Header (`SellerHeader.tsx`)

| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Safe Area / Header | `backgroundColor` | Background Off-white | `colors.background` → `#FAFAFA` |
| Header Border | `borderBottomColor` | Transparent Dark | `rgba(29, 36, 43, 0.08)` |
| Shadow (iOS) | `shadowColor` | Secondary Dark | `colors.secondary` → `#1D242B` |
| Trial Badge | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Trial Badge (Urgent) | `backgroundColor` | Red | `#FF4444` |
| Trial Badge Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Buy Button | `backgroundColor` | Secondary Dark | `colors.secondary` → `#1D242B` |
| Buy Button Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Menu Button | `backgroundColor` | Transparent Dark | `rgba(29, 36, 43, 0.08)` |
| Hamburger Lines | `backgroundColor` | Secondary Dark | `colors.secondary` → `#1D242B` |
| Hamburger Lines (Active) | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Modal Overlay | `backgroundColor` | Dark Overlay | `rgba(0, 0, 0, 0.5)` |
| Menu Container | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Menu Item Text | `color` | Text Primary | `colors.text` → `#1D242B` |
| Menu Divider | `backgroundColor` | Light Gray | `#F3F4F6` |
| Logout Text | `color` | Red | `#EF4444` |

### Agent Header (`AgentHeader.tsx`)

| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Safe Area / Header | `backgroundColor` | Background Off-white | `colors.background` → `#FAFAFA` |
| Header Border | `borderBottomColor` | Transparent Dark | `rgba(29, 36, 43, 0.08)` |
| Shadow (iOS) | `shadowColor` | Secondary Dark | `colors.secondary` → `#1D242B` |
| Trial Badge | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Trial Badge (Urgent) | `backgroundColor` | Red | `#EF4444` |
| Trial Badge Text | `color` | White | `colors.surface` → `#FFFFFF` |
| Menu Button | `backgroundColor` | Transparent Dark | `rgba(29, 36, 43, 0.08)` |
| Hamburger Lines | `backgroundColor` | Secondary Dark | `colors.secondary` → `#1D242B` |
| Hamburger Lines (Active) | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| Modal Overlay | `backgroundColor` | Dark Overlay | `rgba(0, 0, 0, 0.4)` |
| Menu Container | `backgroundColor` | Pure White | `#FFFFFF` |
| Menu Item Text | `color` | Text Primary | `colors.text` → `#1D242B` |
| Menu Divider | `backgroundColor` | Light Gray | `#F3F4F6` |
| Logout Text | `color` | Red | `#EF4444` |

---

## 🏡 Property Card Component (`PropertyCard.tsx`)

| Component | Property | Color | Hex Code |
|-----------|----------|-------|----------|
| Card Background | `backgroundColor` | Surface White | `colors.surface` → `#FFFFFF` |
| Image Container | `backgroundColor` | Surface Secondary | `colors.surfaceSecondary` → `#F5F8FA` |
| Image Placeholder | `backgroundColor` | Surface Secondary | `colors.surfaceSecondary` → `#F5F8FA` |
| Placeholder Text | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Navigator Arrow Background | `backgroundColor` | White (95% opacity) | `rgba(255, 255, 255, 0.95)` |
| Navigator Arrow Text | `color` | Dark | `#222` |
| Navigator Arrow (Disabled) | `opacity` | 30% | `0.3` |
| Carousel Dots (Inactive) | `backgroundColor` | White (50% opacity) | `rgba(255, 255, 255, 0.5)` |
| Carousel Dots (Active) | `backgroundColor` | Pure White | `#FFFFFF` |
| Action Button | `backgroundColor` | White (95% opacity) | `rgba(255, 255, 255, 0.95)` |
| **Buy Badge** | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| **Rent Badge** | `backgroundColor` | Emerald Green | `#10B981` |
| **PG/Hostel Badge** | `backgroundColor` | Amber Orange | `#F59E0B` |
| Badge Text | `color` | Pure White | `#FFFFFF` |
| Property Name | `color` | Text Primary | `colors.text` → `#1D242B` |
| Location | `color` | Text Secondary | `colors.textSecondary` → `#5A6978` |
| Price | `color` | Primary Blue | `colors.primary` → `#0077C0` |
| View Details Button | `backgroundColor` | Primary Blue | `colors.primary` → `#0077C0` |
| View Details Text | `color` | Pure White | `#FFFFFF` |

---

## 🎨 Color Quick Reference by Function

### Primary Actions
| Action | Color | Hex Code |
|--------|-------|----------|
| Primary Buttons | Vibrant Blue | `#0077C0` |
| CTA Buttons | Vibrant Blue | `#0077C0` |
| Links | Vibrant Blue | `#0077C0` |
| Focus States | Vibrant Blue | `#0077C0` |

### Status Indicators
| Status | Background | Text |
|--------|------------|------|
| Active/Success | `#D1FAE5` | `#059669` |
| New/Error | `#FEE2E2` | `#DC2626` |
| Info | `#E3F6FF` | `#0077C0` |
| Neutral | `#F3F4F6` | `#6B7280` |

### Property Types
| Type | Background | Text |
|------|------------|------|
| For Sale | `#0077C0` (Primary) | `#FFFFFF` |
| For Rent | `#10B981` (Emerald) | `#FFFFFF` |
| PG/Hostel | `#F59E0B` (Amber) | `#FFFFFF` |

### Navigation Elements
| Element | Background | Text/Icon |
|---------|------------|-----------|
| Header | `#FAFAFA` | `#1D242B` |
| Menu Button | `rgba(29, 36, 43, 0.08)` | `#1D242B` |
| Menu Dropdown | `#FFFFFF` | `#1D242B` |
| Menu Divider | `#F3F4F6` | - |
| Logout Item | - | `#EF4444` |

---

*Generated from dashboard screens and component files*
