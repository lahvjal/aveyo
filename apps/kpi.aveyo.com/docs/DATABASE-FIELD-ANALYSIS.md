# Database Field Analysis - Final Report
**Date:** December 16, 2025  
**Status:** ✅ Verified and Ready for Implementation

---

## 📊 Executive Summary

After comprehensive database analysis, we have verified all fields needed for KPI calculations. Key findings:

✅ **All required fields exist** (with one substitution: `packet-approval` instead of `packet-date`)  
✅ **timeline ↔ project-data** join works perfectly (99.98% success rate)  
✅ **project-status is in project-data** table (no need for separate `project` table)  
❌ **The `project` table cannot be joined** (different ID system - can be ignored)  
⚠️ **customer-sow** requires regex extraction from title field

---

## 🗄️ Table Relationships (CORRECTED)

### ✅ PRIMARY RELATIONSHIP: timeline ↔ project-data

```sql
SELECT *
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
```

**Join Success Rate:** 6,059 out of 6,060 (99.98%)

**Both tables use the same project-id format:**
- Example IDs: "03321", "03290", "02209", "00009"
- Not UUIDs, just simple numeric strings

---

## 📋 Field Verification Results

### ✅ TIMELINE TABLE (6,061 rows)

| Field Name | Status | Type | NULL Count | Coverage | Usage |
|------------|--------|------|------------|----------|-------|
| `project-id` | ✅ EXISTS | text | 0 | 100% | All JOINs |
| `contract-signed` | ✅ EXISTS | date | 3 | 100.0% | Total Sales |
| `cancellation-reason` | ✅ EXISTS | text | 5,118 | 15.6% | Duplicate filtering (161 "Duplicate Project (Error)") |
| `install-complete` | ✅ EXISTS | date | 3,046 | 49.7% | Installs Complete, Cycle Times |
| `install-stage-status` | ✅ EXISTS | text | 0 | 100% | Install filtering (3,003 = "Complete") |
| `pto-received` | ✅ EXISTS | date | 3,348 | 44.8% | PTO tracking, Active NO PTO |
| `install-appointment` | ✅ EXISTS | date | 2,896 | 52.2% | Install Scheduled, Cycle Times |
| `packet-date` | ❌ MISSING | - | - | - | **Use `packet-approval` instead** |
| **`packet-approval`** | ✅ **USE THIS** | date | 3,776 | **37.7%** | **Cycle Times (PP → Install, PP → PTO)** |

**Additional useful fields found:**
- `item_id` (bigint) - Unique row identifier
- `ntp-complete` (date) - Notice to Proceed complete
- `site-survey-complete` (date)
- `all-permits-complete` (date)

---

### ✅ PROJECT-DATA TABLE (6,061 rows)

| Field Name | Status | Type | NULL Count | Coverage | Usage |
|------------|--------|------|------------|----------|-------|
| `project-id` | ✅ EXISTS | text | 0 | 100% | All JOINs |
| **`project-status`** | ✅ **EXISTS** | varchar(64) | 0 | **100%** | **Jobs ON HOLD, Pull Through, Active NO PTO** |
| `contract-price` | ✅ EXISTS | double | 53 | 99.1% | A/R, M2 calculations, financials |
| `m2-approved` | ✅ EXISTS | date | 3,168 | 47.7% | M2 tracking, Cycle Times |
| `system-size` | ✅ EXISTS | double | 0 | 100% | KW Scheduled, KW Installed |

**Project Status Distribution in project-data:**
| Status | Count | % of Total |
|--------|-------|------------|
| Complete | 2,449 | 40.4% |
| Cancelled | 2,302 | 38.0% |
| Active | 714 | 11.8% |
| On Hold | 276 | 4.6% |
| Pending Cancel | 186 | 3.1% |
| Finance Hold | 123 | 2.0% |
| Pre-Approvals | 8 | 0.1% |
| New Lender | 3 | <0.1% |

---

### ✅ CUSTOMER-SOW TABLE (2,182 rows)

| Field Name | Status | Type | NULL Count | Coverage | Usage |
|------------|--------|------|------------|----------|-------|
| `sow-approved-timestamp` | ✅ EXISTS | datetime | 1,043 | 52.2% | Aveyo Approved KPI |
| `project-id` | ❌ MISSING | - | - | - | Must extract from `title` field |
| **`title`** | ✅ **USE THIS** | text | 0 | 100% | **Extract project ID with regex** |

**Title Format Examples:**
```
"CSOW - #03309 Spencer Patton"
"#03321 John Doe"
```

**Extraction Pattern:**
```javascript
const projectId = title.match(/#(\d+)/)?.[1];
```

**Workaround for Aveyo Approved:**
Since we can't easily join customer-sow to other tables, we should:
1. Query customer-sow directly for `sow-approved-timestamp` counts
2. Extract project-id from title if we need to cross-reference
3. Or use the count directly (may include some duplicates/cancelled projects)

---

### ❌ PROJECT TABLE (6,046 rows) - **IGNORE THIS TABLE**

| Field Name | Status | Notes |
|------------|--------|-------|
| `aveyo-project-id` | ❌ UNUSABLE | UUID format - cannot join to timeline/project-data |
| `project-status` | ⚠️ EXISTS | But cannot be accessed (no way to join) |

**This table uses a completely different ID system (UUIDs) and cannot be joined to our main data sources.**

**✅ GOOD NEWS:** We don't need it! The `project-data` table has all the `project-status` values we need.

---

### ✅ WORK-ORDERS TABLE (11,828 rows)

| Field Name | Status | Type | Notes |
|------------|--------|------|-------|
| `project-id` | ❌ MISSING | - | Uses `project` field instead |
| `project` | ✅ EXISTS | text | Format: "#00002 Test customer 2 - Address" |
| `item_id` | ✅ EXISTS | bigint unsigned | Unique row ID |
| `type` | ✅ EXISTS | varchar(64) | "Install", "Inspection", etc. |

**Note:** Currently not used in any KPI formulas, but available if needed.

---

## 🔧 Required Formula Updates

### 1. **Use `packet-approval` instead of `packet-date`**

**OLD (Incorrect):**
```sql
WHERE `packet-date` IS NOT NULL
```

**NEW (Correct):**
```sql
WHERE `packet-approval` IS NOT NULL
```

**Impact:** All 3 cycle time KPIs
- PP → Install Start
- PP → PTO
- (Install → M2 doesn't use packet field)

---

### 2. **Use `project-data` for `project-status` (NOT `project` table)**

**OLD (Incorrect):**
```sql
FROM timeline t
JOIN project p ON t.`project-id` = p.`aveyo-project-id`  -- ❌ This join FAILS
WHERE p.`project-status` = 'On Hold'
```

**NEW (Correct):**
```sql
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`  -- ✅ This works!
WHERE pd.`project-status` = 'On Hold'
```

**Impact:** All KPIs using project-status
- Jobs ON HOLD
- Pull Through Rate
- Active NO PTO
- Total Sales (checking for Cancelled)

---

### 3. **Handle `customer-sow` Table Differently**

**For Aveyo Approved KPI:**

**Option A: Simple count (may include duplicates)**
```sql
SELECT COUNT(*) 
FROM `customer-sow`
WHERE `sow-approved-timestamp` IS NOT NULL
  AND `sow-approved-timestamp` >= [period_start]
  AND `sow-approved-timestamp` <= [period_end]
```

**Option B: Extract and join (more accurate but complex)**
```sql
SELECT COUNT(DISTINCT pd.`project-id`)
FROM `customer-sow` cs
JOIN `project-data` pd ON SUBSTRING_INDEX(SUBSTRING_INDEX(cs.title, '#', -1), ' ', 1) = pd.`project-id`
WHERE cs.`sow-approved-timestamp` IS NOT NULL
  AND cs.`sow-approved-timestamp` >= [period_start]
  AND cs.`sow-approved-timestamp` <= [period_end]
  AND pd.`project-status` != 'Cancelled'
```

**Recommendation:** Start with Option A for simplicity, move to Option B if accuracy issues arise.

---

## 📊 Data Quality Assessment

### ✅ High Quality Fields (>95% coverage)
- `timeline.contract-signed` - 100.0%
- `timeline.install-stage-status` - 100%
- `project-data.project-status` - 100%
- `project-data.system-size` - 100%
- `project-data.contract-price` - 99.1%

### ⚠️ Medium Quality Fields (40-95% coverage)
- `timeline.install-appointment` - 52.2%
- `timeline.install-complete` - 49.7%
- `timeline.m2-approved` (in project-data) - 47.7%
- `timeline.pto-received` - 44.8%
- `customer-sow.sow-approved-timestamp` - 52.2%

### ⚠️ Low Quality Fields (<40% coverage)
- `timeline.packet-approval` - 37.7% (2,285 records)
  - **Impact:** Cycle time KPIs will only have data for 37.7% of projects
  - This is expected - not all projects reach the Perfect Packet stage

---

## 🎯 Correct SQL Pattern for All KPIs

```sql
SELECT 
  t.`project-id`,
  t.`contract-signed`,
  t.`install-complete`,
  t.`pto-received`,
  t.`packet-approval`,  -- ✅ USE THIS (not packet-date)
  t.`cancellation-reason`,
  pd.`project-status`,  -- ✅ FROM project-data (not project table)
  pd.`contract-price`,
  pd.`m2-approved`,
  pd.`system-size`
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`  -- ✅ This join works!
WHERE 
  (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
  AND [other KPI-specific filters]
```

---

## 🚀 Implementation Checklist

### ✅ Ready to Implement:
- [x] All required fields verified to exist
- [x] Correct join pattern identified (timeline ↔ project-data)
- [x] Field name corrections documented (`packet-approval` not `packet-date`)
- [x] Table corrections documented (use `project-data` not `project` for status)
- [x] Duplicate filtering pattern confirmed (161 "Duplicate Project (Error)" records)
- [x] Status value distribution verified (Active, Complete, On Hold, etc.)

### 📝 Notes for Implementation:
1. Replace all references to `packet-date` with `packet-approval`
2. Replace all joins to `project` table with joins to `project-data` table
3. Use `project-data.project-status` instead of `project.project-status`
4. Handle `customer-sow` separately (Option A: simple count, or Option B: regex extraction)
5. Keep duplicate filtering on all queries: `cancellation-reason != 'Duplicate Project (Error)'`

---

## 🎉 Conclusion

**ALL FIELDS NEEDED FOR KPI CALCULATIONS ARE AVAILABLE!**

The only changes required:
1. **Field name:** `packet-date` → `packet-approval`
2. **Table name:** `project` → `project-data` (for project-status)
3. **Join pattern:** Already correct for timeline ↔ project-data

The database structure fully supports all 26 KPIs defined in the formulas (except financial KPIs pending the `accounting` table).

---

**Next Step:** Update `src/lib/kpi-service.ts` with corrected field and table names.
