# Drill-Down Report Deduplication & Full Garment Name Display

Deduplicates drill-down report presets and filter tier options upon backup restore, and expands the drill-down list view column to display full, untruncated clothes names with horizontal scroll support.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed with the user during Phase 1:
> - **Confirmed Scope of Duplication**: The duplicate "diao dai" and "beautiful" entries occur in the **Drill-down report presets or filter tier options**.
> - **Confirmed Deduplication Strategy**: **Auto-deduplicate by unique ID and name on restore**, ensuring existing and incoming presets with matching IDs or normalized names are cleanly merged without multiplying entries.
> - **Confirmed Clothes Name Presentation**: **Expand column width with horizontal scroll support**, removing `line-clamp-1` truncation so the complete garment title displays naturally in the table list view.

---

### 1. Overview & Core Concept

- **What It Does**: 
  1. Enhances the preset management and backup restore pipeline (`reportPresetService` and `dataService`) so that restoring backups cleanses and merges presets without duplicating entries like "diao dai", "beautiful", or "Aesthetic & Fit Ratings".
  2. Ensures that within each preset, `groupTiers` and `visibleFields` are strictly deduplicated sets.
  3. Updates the drill-down report list view (`DrillRecordRow` and `DrillDownReport`) so the garment name column expands (`min-w-[280px]` to `min-w-[340px]`), removing `line-clamp-1` truncation and allowing horizontal scrolling when viewing long garment names.
- **Target Audience**: Wardrobe catalog and wear report users who import/restore backups and need complete visibility into garment titles across complex sensory categories.
- **Key Value**: Clean, reliable restore workflow with zero phantom duplicate presets or tiers, plus effortless reading of full descriptive garment names in the drill-down table.

---

### 2. User Experience & Visual Design

- **Drill-Down Report List View (`DrillRecordRow.tsx`)**:
  - The "Clothes" table header and cell column width is expanded from the constrained `min-w-[180px]` to a comfortable `min-w-[260px] sm:min-w-[320px]`.
  - The `line-clamp-1` CSS class is removed from the garment title, allowing full names (such as "blue diao dai thick", "pink diao dai chiffon", "white marry old") to be read in their entirety without clipping.
  - The table container maintains smooth horizontal scrolling (`overflow-x-auto` with subtle scroll styling), guaranteeing that long names never compress neighboring status badges or sensory metric columns.
- **Preset Dropdown & Tier Selector**:
  - In `DrillDownReport` and `PresetEditorModal`, preset options in the dropdown and tier selectors are guaranteed distinct and sorted logically.
  - No duplicate "diao dai" or "beautiful" options appear in the tier picker or preset selector.
- **Restore Feedback in Settings (`SyncView.tsx`)**:
  - When a backup archive or seed reset is restored, the status toast and summary card report the deduplicated preset count, cleanly informing the user of the verified unique presets restored.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Deduplication Mechanism**:
  - *Chosen Approach*: Match presets by primary ID and normalized name (`preset.name.toLowerCase().trim()`). If an incoming preset matches an existing preset's ID or normalized name, update/merge its configuration rather than appending a secondary clone. In addition, sanitize preset internal `groupTiers` and `visibleFields` arrays using `Array.from(new Set(...))` to prevent tier-level duplication.
  - *Why*: Solves the root cause where exports and subsequent restores create new or overlapping IDs for presets covering the same concepts ("Aesthetic & Fit Ratings", "Breast Fit", etc.).
  - *Alternatives Considered*: Manual duplicate deletion button only. Rejected because automatic deduplication on restore provides a zero-effort, error-free experience.
- **Decision 2: Horizontal Scrolling vs Multi-line Height Expansion**:
  - *Chosen Approach*: Expand column minimum width (`min-w-[280px]`) and maintain standard clean table row height with horizontal scroll support as requested by the user.
  - *Why*: Preserves high data density and visual rhythm without causing erratic row height variations across the table.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│             Backup Archive (.zip / JSON)               │
│  - drilldown_presets.json / report_presets.json        │
│  - local_db.json / field_definitions.json              │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│         dataService.restoreBackupFromBlob()            │
│  - Extracts presets JSON & validates schema            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│       reportPresetService.importPresets(..., true)     │
│  - Match by ID & normalized name                       │
│  - Merge properties without duplicating entries        │
│  - Sanitize groupTiers: Array.from(new Set(tiers))     │
│  - Persist deduplicated list to LocalStorage & Server  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│       DrillDownReport View & DrillRecordRow Table      │
│  - Clothes column: min-w-[280px] (expanded)            │
│  - Removed line-clamp-1: full name displayed           │
│  - overflow-x-auto: smooth table horizontal scroll     │
└────────────────────────────────────────────────────────┘
```

- **Data Models**:
  - `ReportPreset`: `id`, `name`, `description`, `groupTiers: string[]`, `visibleFields: string[]`, `sortField`, `sortOrder`.
- **Key Modules to Update**:
  1. `src/services/reportPresetService.ts`:
     - Update `importPresets` to deduplicate by both `id` and normalized `name`.
     - Sanitize `groupTiers` and `visibleFields` arrays within each preset to eliminate duplicate tier tags (e.g. repeated `diao dai` or `beautiful`).
     - Update `getAllAvailableFields` to ensure case-insensitive, whitespace-trimmed uniqueness across all built-in and dynamic custom fields.
  2. `src/components/drilldown/DrillRecordRow.tsx`:
     - Expand `min-w-[180px]` to `min-w-[280px] sm:min-w-[320px]`.
     - Remove `line-clamp-1` from garment name container to display full garment titles.
  3. `src/components/drilldown/DrillDownReport.tsx`:
     - Update table header `<th>` min-width to align with expanded row column.
     - Add preset deduplication safeguard on initial mount if legacy duplicates exist in storage.
