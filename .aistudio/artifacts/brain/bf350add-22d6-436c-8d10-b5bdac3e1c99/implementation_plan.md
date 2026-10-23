# Fix Wearing Report Title Truncation & Unwashed Calendar Rewear Calculation

## Overview & User Problem
1. **Wearing Report Name Truncated in Garment Modal** (as seen in `IMG_9977`): In `ClothesModal.tsx` under "Wearing History", the report date and title are squished into an overly narrow container (`truncate` with right-hand fixed-width chips `5.0 hrs`, `Clean`, `wash date`), causing the date and title to collapse into unreadable snippets like `1 \n 202...`.
2. **Unwashed Day Count Incorrectly Resetting on Rewear** (as seen in `IMG_9980`): In `calendarCalculations.ts`, when a garment is reworn (e.g., worn on July 29th, reworn on August 6th, and washed on August 20th), the calendar algorithm was prematurely terminating the cycle on July 29th and starting a new cycle on August 6th. This caused August 7th to display as **Day 2 unwashed** instead of **Day 10 unwashed** (Day 1 on July 29 → Day 8 on Aug 5 → Reworn Day 9 on Aug 6 → Day 10 unwashed on Aug 7).

---

## User Review & Confirmed Decisions

> [!IMPORTANT]
> Both issues identified in user screenshots `IMG_9977` and `IMG_9980` have clear, deterministic root causes:
> 1. **Wearing History List Layout**: The session cards will be refactored to allow the report title and wear date to take full width with responsive wrapping for duration, wash status, and wash date badges.
> 2. **Lifecycle Cycle Grouping**: A garment wear cycle begins on its `firstWearDate` and only completes on its `washDate` (or continues as open if currently unwashed). Any intermediate rewears between `firstWearDate` and `washDate` belong to the **same cycle** and maintain the unbroken cumulative unwashed day count.

---

## 1. Technical Root Cause & Solution Architecture

### Issue 1: Layout Truncation in `ClothesModal.tsx`
- **Root Cause**: The session row in `ClothesModal.tsx` (lines 2827–2858) uses:
  ```tsx
  <div className="flex items-center justify-between ...">
    <div className="space-y-1 min-w-0 pr-2"> {/* Truncated */} </div>
    <div className="flex items-center gap-2 shrink-0"> {/* Takes >70% width on mobile */} </div>
  </div>
  ```
  On mobile viewports (~375–420px), the chips `5.0 hrs`, `Clean`, `wash date: 2026-10-22` with `shrink-0` consume almost the entire row width, forcing the title into a 25px width where text truncates to 1–3 characters.
- **Solution**:
  - Restructure the card into a clean two-row responsive layout:
    - **Header Row**: Wear Date (with calendar icon) and Report Title taking prominent full width with word wrapping (no truncation).
    - **Meta Row**: Duration (`5.0 hrs`), wash status badge (`Clean` / `Need Wash`), and `wash date: YYYY-MM-DD` neatly wrapped with Chevron icon.

### Issue 2: Rewear Cycle Reset in `calendarCalculations.ts`
- **Root Cause**: Lines 480–497 in `src/utils/calendarCalculations.ts`:
  ```ts
  if (activeCycle.washDate && activeCycle.washDate >= rec.wearDateKey) {
    // Completed cycle
    cycles.push(...);
    activeCycle = null;
  }
  ```
  When the first wear on `2026-07-29` was processed with its known wash date `2026-08-20`, line 480 evaluated `2026-08-20 >= 2026-07-29` (True), immediately pushed the cycle, and set `activeCycle = null`!
  When the next record on `2026-08-06` was processed, it started a **second cycle** starting on `2026-08-06`, resetting the day counter to Day 1 on Aug 6 and Day 2 on Aug 7.
- **Solution**:
  - Re-architect cycle grouping:
    1. Group wear records into genuine laundry cycles delimited by actual wash boundaries.
    2. A cycle spans from `firstWearDate` to `washDate`.
    3. Any wear record with `wearDateKey <= cycle.washDate` is an intermediate rewear inside that existing cycle.
    4. Only when a wear record occurs **after** the previous cycle's `washDate` does a new cycle begin.
    5. The day counter `dayCount` runs sequentially from `firstWearDate` through to `washDate` (or today), ensuring Day 9 is the rewear on Aug 6, Day 10 is Aug 7, Day 11 is Aug 8, ..., and Day 23 is Aug 20 (Washed).

---

## 2. System Architecture & Lifecycle Diagram

```
Wear Record 1: 2026-07-29 (Wash Date: 2026-08-20)
Wear Record 2: 2026-08-06 (Wash Date: 2026-08-20)
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Cycle: 2026-07-29 ──────────────────────────────────────► 2026-08-20  │
│                                                                        │
│ Day 1 (Jul 29): [👕 Worn 10h] (Starts unwashed cycle)                  │
│ Day 2 (Jul 30): Day 2 unwashed                                         │
│ ...                                                                    │
│ Day 8 (Aug 5):  Day 8 unwashed                                         │
│ Day 9 (Aug 6):  [👕 Worn 5h] (Reworn without wash — cycle continues!)   │
│ Day 10 (Aug 7): Day 10 unwashed (Cumulative count correctly preserved) │
│ ...                                                                    │
│ Day 23 (Aug 20): [💧 Washed] (Concludes cycle and resets unwashed count)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Steps

1. **`src/utils/calendarCalculations.ts`**:
   - Refactor `computeGarmentLifecycleCalendarData`:
     - Sort all wear records chronologically.
     - Group records by cycle boundary: an active cycle remains open until wear records advance past `cycle.washDate`.
     - Intermediate wear records augment `cycle.wearDates` and `cycle.totalDurationSeconds` without terminating the cycle.
     - When generating `dayStatusMap`, compute `daysSinceFirstWear` continuously from `firstWearDate` across all days in the span.
     - If a day is both a wear day and within the unwashed span, tag it as `wear_day` while retaining the correct `daysSinceFirstWear`.
     - On the day following the rewear (August 7), `daysSinceFirstWear` will correctly evaluate to 10 (`Day 10 unwashed`).

2. **`src/components/ClothesModal.tsx`**:
   - Refactor the "Wearing History" session cards (around line 2820):
     - Replace the single cramped horizontal flex container with a structured responsive layout.
     - Top row: Calendar icon, wear date formatted nicely (e.g. `2026-08-06`), and full report title without truncation (`break-words [word-break:normal]`).
     - Bottom row: Badges for duration (`5.0 hrs`), status (`Clean` / `Need wash`), and wash date (`wash date: 2026-08-20`).
     - Arrow indicator positioned gracefully on the right.

3. **Verification**:
   - Run unit checks on `computeGarmentLifecycleCalendarData` with `white marry old` (`recxEOHFMuwdAUj7HtS`).
   - Verify August 6 is `wear_day` (Day 9) and August 7 is `unwashed_span` (Day 10 unwashed).
   - Run `lint_applet` and `compile_applet` to confirm 0 errors.
