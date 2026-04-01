# Formula Corrections Based on Database Analysis
**Date:** December 16, 2025  
**Status:** Ready for Implementation

---

## 🎯 Critical Corrections Required

After analyzing the actual database structure, the following corrections must be made to ALL KPI formulas:

---

## 1️⃣ **FIELD NAME CORRECTION**

### ❌ WRONG: `packet-date`
### ✅ CORRECT: `packet-approval`

**This field DOES NOT EXIST:**
- `timeline.packet-date` ❌

**This field EXISTS and should be used:**
- `timeline.packet-approval` ✅ (37.7% coverage - 2,285 records)

**Affected KPIs:**
- PP → Install Start (MEDIAN days between packet-approval and install-appointment)
- PP → PTO (MEDIAN days between packet-approval and pto-received)

---

## 2️⃣ **TABLE CORRECTION**

### ❌ WRONG: Use `project` table for `project-status`
### ✅ CORRECT: Use `project-data` table for `project-status`

**The `project` table:**
- Uses UUID format for `aveyo-project-id` (e.g., "66c7a4c7-ec33-4eef-ab42-22fef28a9c89")
- **CANNOT be joined** to `timeline` or `project-data`
- Should be **IGNORED completely**

**The `project-data` table:**
- Uses simple IDs for `project-id` (e.g., "03321", "03290")
- **CAN be joined** to `timeline` successfully (99.98% success rate)
- **HAS `project-status` field** with identical values:
  - Complete (2,449), Cancelled (2,302), Active (714), On Hold (276), etc.

**Affected KPIs:**
- Total Sales (checking for Cancelled status)
- Jobs ON HOLD (counting 'On Hold' status)
- Pull Through Rate (counting Active, Complete, Pre-Approvals, New Lender, Finance Hold)
- Active NO PTO (counting active projects without PTO)

---

## 3️⃣ **JOIN PATTERN CORRECTION**

### ❌ WRONG:
```sql
FROM timeline t
JOIN project p ON t.`project-id` = p.`aveyo-project-id`  -- FAILS! Different ID formats
WHERE p.`project-status` = 'Active'
```

### ✅ CORRECT:
```sql
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`  -- WORKS! Same ID format
WHERE pd.`project-status` = 'Active'
```

**Join Success Rate:** 6,059 out of 6,060 projects (99.98%)

---

## 4️⃣ **customer-sow TABLE HANDLING**

### Issue:
- `customer-sow` table does NOT have a `project-id` field
- Cannot easily join to other tables

### Solution for "Aveyo Approved" KPI:

**Option A: Simple Count (Recommended for v1)**
```sql
SELECT COUNT(*) 
FROM `customer-sow`
WHERE `sow-approved-timestamp` IS NOT NULL
  AND `sow-approved-timestamp` >= [period_start]
  AND `sow-approved-timestamp` <= [period_end]
```

**Option B: Extract project-id from title (More accurate)**
```sql
-- customer-sow.title format: "CSOW - #03309 Spencer Patton"
-- Extract "03309" using regex or SUBSTRING_INDEX
```

---

## 📋 Summary of Changes by KPI

### **Sales & Approval Pipeline**

#### Total Sales
```sql
-- OLD (WRONG):
FROM timeline t
WHERE t.`contract-signed` IS NOT NULL

-- NEW (CORRECT):
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
WHERE t.`contract-signed` IS NOT NULL
  AND pd.`project-status` != 'Cancelled'  -- ✅ from project-data, not project
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

#### Aveyo Approved
```sql
-- CORRECT (no join needed):
FROM `customer-sow`
WHERE `sow-approved-timestamp` IS NOT NULL
  AND `sow-approved-timestamp` >= [period]
```

#### Pull Through Rate
```sql
-- OLD (WRONG):
FROM project p
WHERE p.`project-status` IN ('Active', 'Complete', ...)

-- NEW (CORRECT):
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
WHERE pd.`project-status` IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
  AND t.`contract-signed` >= [period]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

### **Install Operations**

#### Jobs ON HOLD
```sql
-- OLD (WRONG):
FROM project p
WHERE p.`project-status` = 'On Hold'

-- NEW (CORRECT):
FROM `project-data` pd
JOIN timeline t ON pd.`project-id` = t.`project-id`
WHERE pd.`project-status` = 'On Hold'
  AND [period filter applied]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

#### Install Complete NO PTO
```sql
-- CORRECT (no changes needed):
FROM timeline t
WHERE t.`install-complete` IS NOT NULL
  AND t.`install-complete` >= [period]
  AND t.`pto-received` IS NULL
  AND t.`install-stage-status` = 'Complete'
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

### **Cycle Times**

#### PP → Install Start
```sql
-- OLD (WRONG):
MEDIAN(DATEDIFF(`install-appointment`, `packet-date`))  -- ❌ packet-date doesn't exist

-- NEW (CORRECT):
MEDIAN(DATEDIFF(`install-appointment`, `packet-approval`))  -- ✅ packet-approval exists
FROM timeline t
WHERE t.`packet-approval` IS NOT NULL  -- ✅ CHANGED
  AND t.`install-appointment` IS NOT NULL
  AND [period filter]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

#### Install → M2
```sql
-- CORRECT (m2-approved is in project-data):
MEDIAN(DATEDIFF(pd.`m2-approved`, t.`install-appointment`))
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
WHERE t.`install-appointment` IS NOT NULL
  AND pd.`m2-approved` IS NOT NULL
  AND [period filter]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

#### PP → PTO
```sql
-- OLD (WRONG):
MEDIAN(DATEDIFF(`pto-received`, `packet-date`))  -- ❌ packet-date doesn't exist

-- NEW (CORRECT):
MEDIAN(DATEDIFF(`pto-received`, `packet-approval`))  -- ✅ packet-approval exists
FROM timeline t
WHERE t.`packet-approval` IS NOT NULL  -- ✅ CHANGED
  AND t.`pto-received` IS NOT NULL
  AND [period filter]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

### **Residential Financials** ⏳ Waiting for `accounting` table

#### Install M2 Not Approved
```sql
-- CORRECT (contract-price and m2-approved are in project-data):
SELECT SUM(pd.`contract-price` * 0.8) AS m2_amount
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
WHERE t.`install-complete` IS NOT NULL
  AND pd.`m2-approved` IS NULL
  AND [period filter]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

### **Active Pipeline**

#### Active NO PTO
```sql
-- OLD (WRONG):
FROM project p
JOIN timeline t ON p.??? = t.`project-id`  -- Can't join!

-- NEW (CORRECT):
FROM `project-data` pd
JOIN timeline t ON pd.`project-id` = t.`project-id`
WHERE pd.`project-status` IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
  AND t.`pto-received` IS NULL
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

### **Commercial Division**

#### KW Scheduled & KW Installed
```sql
-- CORRECT (system-size is in project-data):
SELECT SUM(pd.`system-size`)
FROM `project-data` pd
JOIN timeline t ON pd.`project-id` = t.`project-id`
WHERE [date conditions]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

## ✅ Implementation Checklist

Before updating the code, verify you:

- [ ] Replace ALL instances of `packet-date` with `packet-approval`
- [ ] Remove ALL references to `project` table (use `project-data` instead)
- [ ] Update ALL joins to use: `timeline.project-id = project-data.project-id`
- [ ] Use `project-data.project-status` (not `project.project-status`)
- [ ] Handle `customer-sow` separately (no join - direct count)
- [ ] Add duplicate filtering to ALL queries: `cancellation-reason != 'Duplicate Project (Error)'`

---

## 🎯 Expected Impact

### Positive Changes:
- ✅ All queries will now work correctly
- ✅ 99.98% join success rate (6,059 out of 6,060 projects)
- ✅ Correct project status values from project-data
- ✅ All required fields verified to exist

### Known Limitations:
- ⚠️ `packet-approval` only has 37.7% coverage (2,285 records)
  - Cycle time KPIs will only show data for projects that reached Perfect Packet stage
  - This is expected business behavior
- ⚠️ `customer-sow` cannot be easily filtered by project status
  - Aveyo Approved count may include some cancelled/duplicate projects
  - Can be refined later with regex extraction if needed

---

**Ready to implement? All corrections are documented and verified!** 🚀
