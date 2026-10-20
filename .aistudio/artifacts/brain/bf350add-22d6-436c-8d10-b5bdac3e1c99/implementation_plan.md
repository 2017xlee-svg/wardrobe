# Fix Climate Scenarios Field Restore & Safe Merge Protection

Address the issue where climate scenario fields (`when with aircond: hot feeling`, `when with aircond: leg feeling`, `when without aircond: hot feeling`, `when without aircond: leg feeling`, `when sleep under fan: hot feeling`, `when sleep under fan: leg feeling`) fail to restore or appear as "No data" after backup restore. Implement robust alias resolution, prevent empty strings from overwriting valid existing values, restore and retain `fieldExplanations`, and synchronize preserved climate data in the local database.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1:
> - **Source of Truth**: Climate scenario values originate from backup zip or JSON archives.
> - **Empty Value Overwrite Protection**: Preserve existing saved values and never overwrite with empty strings (`""`) or missing incoming keys during restore merge.
> - **Scope**: Strictly restore explicit field values from backup data; do not parse or infer values from freeform description notes.

- **Confirmed Decision 1**: Never allow empty strings (`""`) or whitespace-only values from incoming backup items to overwrite existing populated values in `dataService.ts` and `server.ts`.
- **Confirmed Decision 2**: Enhance `normalizeGarment` with comprehensive alias matching (case-insensitive, colon/space/punctuation variations, camelCase, and `customFields`/`extraAttributes` lookups).
- **Confirmed Decision 3**: Retain and restore `fieldExplanations` dictionaries for garments so tooltips, descriptions, and rationale notes are fully preserved.
- **Confirmed Decision 4**: Synchronize verified seed backup values (such as `blue diao dai thick`'s climate records) into `data/local_db.json` and `src/initialData.json`.

---

### 1. Root Cause Analysis

1. **Destructive Empty-String Merge Bug in `dataService.ts` and `server.ts`**:
   - During restore, incoming garments are passed through `normalizeGarment(rawC)`, which initialized all 6 climate fields to empty string `""` when absent.
   - The merge loop checked `if (!(k in c))`: since `k in c` was true (with `""`), existing populated values like `"not so cold"` or `"hot"` in the current database were discarded and replaced with `""`.
2. **Missing Aliases in `normalizeGarment`**:
   - Unlike other fields (e.g., `thick clothes`, `materialProp`, `sit breast ok: With 聚拢bra`), the climate fields had zero alias matching. Any backup containing keys like `when with aircond hot feeling` (no colon), `whenWithAircondHot`, `when without aircond: leg feeling`, or values placed inside `customFields` failed to map to the canonical keys.
3. **Omission of `fieldExplanations`**:
   - `normalizeGarment` did not copy `fieldExplanations` from incoming objects, causing rich explanatory tooltips (e.g., "due to thick chiffon material, thick clothes so no so cold") to be lost during normalization.

---

### 2. Proposed Technical Changes

#### A. Comprehensive Alias & Deep Lookup in `normalizeGarment` (`src/services/dataService.ts`)
- Implement a helper function `extractClimateField(obj: any, baseType: 'withAircond' | 'withoutAircond' | 'sleepFan', feelingType: 'hot' | 'leg'): string` that inspects:
  - Exact canonical keys (`when with aircond: hot feeling`, etc.)
  - Punctuation variations (`when with aircond hot feeling`, `when with aircond:hot feeling`, `when with aircond - hot feeling`)
  - CamelCase and snake_case (`whenWithAircondHot`, `when_with_aircond_hot_feeling`)
  - Nested entries in `customFields` and `extraAttributes`
  - Normalized case-insensitive key search across all object keys
- Add `fieldExplanations` extraction to ensure garment-level explanations are preserved.

#### B. Safe Non-Empty Merge Strategy (`src/services/dataService.ts` & `server.ts`)
- In `restoreFullBackupZip` (`dataService.ts`) and `/api/backup/restore-zip` (`server.ts`):
  - When merging an existing garment with an incoming backup garment:
    ```ts
    // For each property in existing garment:
    if (existingVal !== undefined && existingVal !== null && String(existingVal).trim() !== '') {
      const incomingVal = c[k];
      if (incomingVal === undefined || incomingVal === null || String(incomingVal).trim() === '') {
        c[k] = existingVal; // Preserve existing value; never overwrite with empty string!
      }
    }
    ```
  - Deep-merge `fieldExplanations` so explanations from both sources are combined without losing data.

#### C. Preview & Backup Inspection Update (`src/services/dataService.ts`)
- In `inspectBackupArchive`, ensure climate scenario fields are recognized in the field diff and preview tables so the user clearly sees incoming vs existing climate values before confirming restore.

#### D. Sync Preserved Climate Data (`data/local_db.json` & `src/initialData.json`)
- Restore known climate values from `data/seed_data_backup.json` (including `rec7yUwr2NlVnu5lDQj` "blue diao dai thick" and associated `fieldExplanations`) into `data/local_db.json` and `src/initialData.json`.

---

### 3. Verification & Testing

1. **Data Integrity Check**: Verify `data/local_db.json` and `src/initialData.json` have valid climate entries and `fieldExplanations`.
2. **Modal Rendering Check**: Verify `ClothesModal` renders climate scenarios with actual data badges instead of "No data" for populated garments.
3. **Restore Test**: Test backup restore with a test payload containing climate fields (both with and without colons/customFields) to confirm they restore cleanly and never get blanked out.
4. **App Build Verification**: Run `compile_applet` and `lint_applet` to confirm zero compilation or lint errors.
