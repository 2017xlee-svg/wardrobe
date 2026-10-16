# Accessible App Font Scaling & Interactive Size Switcher

A system-wide typography scaling architecture and persistent user interface control that increases the application font size by 15–20% for comfortable daily reading, while providing an instant, accessible font size switcher (Standard, Comfortable, Large) in the top navigation bar.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Choices from Phase 1 Clarification:**
> - **Font Scale Adjustment Method**: Interactive font size switcher with persistent local storage.
> - **Default Baseline Increase**: Comfortable increase of **+18%** (~1.18x multiplier, scaling base root typography from 16px to 18.5px), making all labels, table records, cards, and modal details noticeably clearer without disrupting responsive layout math.
> - **Available Scale Presets**:
>   1. `Standard (100% / 16px)`: Original baseline density.
>   2. `Comfortable (118% / 18.5px)`: **(Default)** Comfortable reading for daily wear records, garment tags, and reports.
>   3. `Large (132% / 21px)`: High-contrast, maximum-readability mode for low-light or outdoor viewing.

---

## 1. Overview & Core Concept

- **What It Does**: Scales the entire visual hierarchy of the Wardrobe & Wear Journal app by dynamically adjusting root `rem` typographic tokens, and introduces a dedicated `Aa` font scale selector in the top bar with instant preview and persistent `localStorage` retention.
- **Target Audience / Persona**: Users managing garments, reading sensory reports, reviewing laundry status, or inspecting drill-down tables on both desktop screens and mobile handheld devices (such as the Moto Edge 30).
- **Key Value**: Eliminates eye strain and micro-text squinting across all modules (Closet Studio, Laundry Care, Wear Journal, Drill-Down Reports, AI Advisor, and full-screen Modals) while preserving single-line control integrity and touch target ergonomics.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **First-Load Experience**: When the user opens the application, the app automatically initializes in the **Comfortable (+18%)** reading mode. All headings, card texts, metadata lines, and inputs render with comfortable, legible proportions.
2. **Switching Font Scale**:
   - The user clicks or taps the `Aa` button in the top navigation bar (or mobile quick bar).
   - An accessible popover menu appears showing the three curated tiers with explicit magnification percentages and indicator checkmarks.
   - Selecting a tier immediately applies the scale to the document root with zero page flicker, updates the active checkmark, and stores the preference in `localStorage`.
3. **Responsive Preservation**: Grid layouts, card inner paddings, and modal scroll areas adapt fluidly because all component dimensions and gaps use responsive `rem` and fluid flexbox/grid containers.

### Visual Identity & Theme
- **Color Palette & Contrast**: Retains the refined 60-30-10 palette (slate-50 canvas, crisp white container cards, slate-900 primary typography, and indigo/purple accents).
- **Typography & Scale**:
  - *Standard Mode (100%)*: Root `16px` (e.g. `text-xs` = 12px, `text-sm` = 14px, `text-base` = 16px, `text-lg` = 18px).
  - *Comfortable Mode (118%)*: Root `18.5px` (e.g. `text-xs` = ~14px, `text-sm` = ~16.2px, `text-base` = ~18.5px, `text-lg` = ~20.8px).
  - *Large Mode (132%)*: Root `21px` (e.g. `text-xs` = ~15.8px, `text-sm` = ~18.4px, `text-base` = ~21px, `text-lg` = ~23.6px).
- **Touch & Accessibility Standards**:
  - `Aa` trigger button hit target is $\ge 44 \times 44\text{px}$ adhering to mobile thumb-zone specifications.
  - Text maintains WCAG AA contrast ratio ($\ge 4.5:1$).
  - All button labels maintain `whitespace-nowrap shrink-0` with truncation guards to prevent awkward two-line button breaks.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: CSS Root Scaling (`rem` scaling via `data-font-size` attribute)**
  - *Chosen Approach*: Bind the active scale to `html[data-font-size="..."]` in CSS, modulating the base font size between 16px, 18.5px, and 21px.
  - *Why*: Tailwind CSS typography utilities (`text-xs`, `text-sm`, `text-base`, `text-xl`) are natively expressed in `rem`. Modulating root font size uniformly scales text in every component, child modal, and table column without needing to modify hundreds of individual utility classes.
  - *Alternatives Considered*: Manually changing class names from `text-xs` to `text-sm` across dozens of components was rejected because it introduces maintenance drift and does not allow users to toggle back and forth.

- **Decision 2: Three Pre-Calibrated Tiers vs. Freeform Slider**
  - *Chosen Approach*: Curate three balanced presets (Standard, Comfortable +18%, Large +32%).
  - *Why*: Freeform sliders frequently produce odd pixel fractional rendering, clipped cards, or horizontal overflow. Fixed calibrated steps guarantee visual balance and touch hit-target harmony.
  - *Alternatives Considered*: A slider with continuous percentages was rejected due to risk of broken layout math on dense drill-down tables.

---

## 4. Technical Architecture & Data Strategy

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 localStorage                         │   │
│   │         ('wardrobe_font_scale': 'comfortable')      │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │ initializes / persists        │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 FontSizeProvider / Hook             │   │
│   │  • activeScale: 'default' | 'comfortable' | 'large' │   │
│   │  • setScale(scale)                                  │   │
│   └───────────────┬─────────────────────────┬───────────┘   │
│                   │                         │               │
│     applies DOM   │                         │ renders UI    │
│     attribute     ▼                         ▼               │
│   ┌────────────────────────┐    ┌───────────────────────┐   │
│   │ <html                  │    │ Top Bar Header        │   │
│   │  data-font-size=       │    │ • [Aa Size Switcher]  │   │
│   │   "comfortable">       │    │   Dropdown / Modal    │   │
│   └───────────┬────────────┘    └───────────────────────┘   │
│               │                                             │
│   ┌───────────┴─────────────────────────────────────────┐   │
│   │ CSS Root Rules (index.css)                          │   │
│   │ • [data-font-size="default"]     -> font-size: 16px │   │
│   │ • [data-font-size="comfortable"] -> font-size: 18.5px│  │
│   │ • [data-font-size="large"]       -> font-size: 21px │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component & State Lifecycle Mapping
1. **Initial Hydration**:
   - `index.html` reads `'wardrobe_font_scale'` before initial paint (defaulting to `'comfortable'`) to eliminate any FOUC (Flash of Unstyled Content).
2. **Interactive Component**:
   - `FontSizeSwitcher`: A compact, accessible dropdown button in `App.tsx` displaying current scale indicator.
   - Dropdown displays 3 choices with scale percentage tags and active checkmarks.
3. **Global Styling Rules**:
   - `src/index.css` defines root rules for `data-font-size` with smooth text transitions and clean word-wrapping guarantees.
