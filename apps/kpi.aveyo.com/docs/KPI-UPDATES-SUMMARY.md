# KPI Formula Updates - Complete Summary

## 📋 Overview

This document summarizes all the clarifications and updates made to the KPI formulas based on the December 16, 2025 analysis session.

---

## 🔄 Global Changes Applied to ALL KPIs

### 1. **Duplicate Filtering** (161 projects affected)
```sql
AND (cancellation-reason IS NULL OR cancellation-reason != 'Duplicate Project (Error)')
```
- Applied to every KPI calculation
- Excludes 161 duplicate project entries
- Source: `timeline.cancellation-reason` field

### 2. **Period Filtering**
- All KPIs now respect the time period filter bar selection
- Consistent date range filtering across the dashboard
- Period options: Current Week, MTD, YTD

### 3. **Calculation Method**
- **ALL cycle time KPIs** now use **MEDIAN** instead of AVERAGE
- More accurate representation of typical timelines
- Less affected by outliers

---

## 1️⃣ Sales & Approval Pipeline Updates

### **Total Sales**
**Changes:**
- ✅ Added JOIN to `project` table
- ✅ Added check for `project-status != 'Cancelled'`
- ✅ Added duplicate filtering

**Formula:**
```sql
SELECT COUNT(*) 
FROM timeline t
JOIN project p ON t.`project-id` = p.`project-id`
WHERE t.`contract-signed` IS NOT NULL
  AND t.`contract-signed` >= [period_start]
  AND t.`contract-signed` <= [period_end]
  AND p.`project-status` != 'Cancelled'
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

### **Aveyo Approved**
**Changes:**
- ✅ Changed source from `timeline` to `customer-sow` table
- ✅ Added DISTINCT to handle duplicate entries
- ✅ Added duplicate filtering

**Formula:**
```sql
SELECT COUNT(DISTINCT project-id) 
FROM `customer-sow`
WHERE `sow-approved-timestamp` IS NOT NULL
  AND `sow-approved-timestamp` >= [period_start]
  AND `sow-approved-timestamp` <= [period_end]
  AND (cancellation-reason IS NULL OR cancellation-reason != 'Duplicate Project (Error)')
```

### **Pull Through Rate**
**Changes:**
- ✅ Clarified to use same time period as Total Sales
- ✅ Confirmed exact project statuses to include
- ✅ Added duplicate filtering

**Formula:**
```sql
Numerator = COUNT projects WHERE:
  - project-status IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
  - contract-signed >= [period_start] AND <= [period_end] (SAME as Total Sales)
  - Exclude 'Duplicate Project (Error)'

Denominator = Total Sales (from above)

Pull Through Rate = (Numerator / Denominator) × 100
```

**Expected values:**
- Active: 713 projects
- Complete: 2,474 projects
- Pre-Approvals: 6 projects
- New Lender: 4 projects
- Finance Hold: 124 projects
- **Total: ~3,321 projects** in pull-through calculation

---

## 2️⃣ Install Operations Updates

### **Jobs ON HOLD**
**Changes:**
- ✅ Added period filtering (previously counted all time)
- ✅ Added duplicate filtering
- ✅ Confirmed uses `project.project-status = 'On Hold'`

**Formula:**
```sql
SELECT COUNT(*) 
FROM project p
JOIN timeline t ON p.`project-id` = t.`project-id`
WHERE p.`project-status` = 'On Hold'
  AND [period filter applied]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

**Current count:** 286 projects on hold (will vary by period)

### **Installs Complete**
**Changes:**
- ✅ Confirmed correct implementation
- ✅ Uses `install-stage-status = 'Complete'`
- ✅ Excludes duplicates

**Formula:**
```sql
SELECT COUNT(*) 
FROM timeline
WHERE `install-complete` IS NOT NULL
  AND `install-stage-status` = 'Complete'
  AND `install-complete` >= [period_start]
  AND `install-complete` <= [period_end]
  AND (`cancellation-reason` IS NULL OR `cancellation-reason` != 'Duplicate Project (Error)')
```

### **Install Complete NO PTO**
**Changes:**
- ✅ Added period filtering by `install-complete` date
- ✅ Added requirement for `install-stage-status = 'Complete'`
- ✅ Added duplicate filtering

**Formula:**
```sql
SELECT COUNT(*) 
FROM timeline
WHERE `install-complete` IS NOT NULL
  AND `install-complete` >= [period_start]
  AND `install-complete` <= [period_end]
  AND `pto-received` IS NULL
  AND `install-stage-status` = 'Complete'
  AND (`cancellation-reason` IS NULL OR `cancellation-reason` != 'Duplicate Project (Error)')
```

### **Install Scheduled**
**Changes:**
- ✅ Clarified to count appointments IN the period (not just future)
- ✅ Added duplicate filtering

**Formula:**
```sql
SELECT COUNT(*) 
FROM timeline
WHERE `install-appointment` IS NOT NULL
  AND `install-appointment` >= [period_start]
  AND `install-appointment` <= [period_end]
  AND (`cancellation-reason` IS NULL OR `cancellation-reason` != 'Duplicate Project (Error)')
```

---

## 3️⃣ Cycle Times Updates

### **PP → Install Start**
**Changes:**
- ✅ Changed from AVERAGE to **MEDIAN**
- ✅ Confirmed field name is `packet-date` (not packet-approval)
- ✅ Measures time between `packet-date` and `install-appointment`
- ✅ Period filtering applied
- ✅ Duplicate filtering applied

**Formula:**
```sql
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY DATEDIFF(`install-appointment`, `packet-date`))
FROM timeline
WHERE `packet-date` IS NOT NULL
  AND `install-appointment` IS NOT NULL
  AND [period determined by filter bar]
  AND (`cancellation-reason` IS NULL OR `cancellation-reason` != 'Duplicate Project (Error)')
```

### **Install → M2**
**Changes:**
- ✅ Changed from AVERAGE to **MEDIAN**
- ✅ Confirmed `m2-approved` is in `project-data` table
- ✅ Measures time between `install-appointment` and `m2-approved`
- ✅ Period filtering applied to include projects in the selected period
- ✅ Duplicate filtering applied

**Formula:**
```sql
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY DATEDIFF(pd.`m2-approved`, t.`install-appointment`))
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
WHERE t.`install-appointment` IS NOT NULL
  AND pd.`m2-approved` IS NOT NULL
  AND [period determined by filter bar]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

### **PP → PTO**
**Changes:**
- ✅ Changed from AVERAGE to **MEDIAN**
- ✅ Confirmed field name is `packet-date` (not packet-approval)
- ✅ Period determined by filter bar
- ✅ Duplicate filtering applied

**Formula:**
```sql
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY DATEDIFF(`pto-received`, `packet-date`))
FROM timeline
WHERE `packet-date` IS NOT NULL
  AND `pto-received` IS NOT NULL
  AND [period determined by filter bar]
  AND (`cancellation-reason` IS NULL OR `cancellation-reason` != 'Duplicate Project (Error)')
```

---

## 4️⃣ Residential Financials Updates

### **⚠️ IMPORTANT: Waiting for `accounting` table**

All financial KPIs depend on the new `accounting` table currently being added to the database.

### **A/R (M2/M3)**
**Changes:**
- ✅ Confirmed M2 = 80% of contract price
- ✅ Confirmed M3 = 20% of contract price
- ✅ Confirmed `contract-price` is in `project-data` table
- ✅ Period filtering applied
- ✅ Duplicate filtering applied

**Formula:**
```sql
-- M2 Outstanding
SELECT SUM(pd.`contract-price` * 0.8) AS m2_amount
FROM accounting a
JOIN `project-data` pd ON a.project_id = pd.`project-id`
JOIN timeline t ON pd.`project-id` = t.`project-id`
WHERE a.M2_Submitted_Date IS NOT NULL
  AND a.M2_Received_Date IS NULL
  AND [period determined by filter bar]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')

-- M3 Outstanding
SELECT SUM(pd.`contract-price` * 0.2) AS m3_amount
FROM accounting a
JOIN `project-data` pd ON a.project_id = pd.`project-id`
JOIN timeline t ON pd.`project-id` = t.`project-id`
WHERE a.M3_Submitted_Date IS NOT NULL
  AND a.M3_Received_Date IS NULL
  AND [period determined by filter bar]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')

-- Total A/R
Total A/R = M2 Outstanding + M3 Outstanding
```

### **Revenue Received**
**Changes:**
- ✅ Confirmed uses `accounting.revenue_received` field
- ✅ Period determined by filter bar

**Formula:**
```sql
SELECT SUM(`revenue_received`) 
FROM accounting
WHERE [period determined by filter bar - need to confirm date field]
```

### **Install M2 Not Approved**
**Changes:**
- ✅ Confirmed `m2-approved` is in `project-data` table
- ✅ Confirmed uses 80% of contract price
- ✅ Period filtering applied
- ✅ Duplicate filtering applied

**Formula:**
```sql
SELECT SUM(pd.`contract-price` * 0.8) AS m2_amount
FROM timeline t
JOIN `project-data` pd ON t.`project-id` = pd.`project-id`
WHERE t.`install-complete` IS NOT NULL
  AND t.`install-complete` >= [period_start]
  AND t.`install-complete` <= [period_end]
  AND pd.`m2-approved` IS NULL
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

## 5️⃣ Active Pipeline Updates

### **Active NO PTO**
**Changes:**
- ✅ Added duplicate filtering
- ✅ Confirmed no time period filter (counts all active projects)

**Formula:**
```sql
SELECT COUNT(*) 
FROM project p
JOIN timeline t ON p.`project-id` = t.`project-id`
WHERE p.`project-status` IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
  AND t.`pto-received` IS NULL
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

## 6️⃣ Commercial Division Updates

### **KW Scheduled**
**Changes:**
- ✅ Clarified period determined by filter bar
- ✅ Added duplicate filtering

**Formula:**
```sql
SELECT SUM(pd.`system-size`)
FROM `project-data` pd
JOIN timeline t ON pd.`project-id` = t.`project-id`
WHERE t.`install-appointment` IS NOT NULL
  AND t.`install-complete` IS NULL
  AND [period determined by filter bar]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

### **KW Installed**
**Changes:**
- ✅ Confirmed correct implementation
- ✅ Added duplicate filtering

**Formula:**
```sql
SELECT SUM(pd.`system-size`)
FROM `project-data` pd
JOIN timeline t ON pd.`project-id` = t.`project-id`
WHERE t.`install-complete` IS NOT NULL
  AND t.`install-complete` >= [period_start]
  AND t.`install-complete` <= [period_end]
  AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != 'Duplicate Project (Error)')
```

---

## 📊 Database Field Values Discovered

### Project Status Values (8 unique):
| Status | Count | Usage |
|--------|-------|-------|
| Complete | 2,474 | Pull Through Rate, Active NO PTO |
| Cancelled | 2,247 | Excluded from Total Sales |
| Active | 713 | Pull Through Rate, Active NO PTO |
| On Hold | 286 | Jobs ON HOLD KPI |
| Pending Cancel | 191 | Excluded from active counts |
| Finance Hold | 124 | Pull Through Rate, Active NO PTO |
| Pre-Approvals | 6 | Pull Through Rate, Active NO PTO |
| New Lender | 4 | Pull Through Rate, Active NO PTO |

### Install Stage Status Values (7 unique):
| Status | Count | Usage |
|--------|-------|-------|
| Complete | 3,003 | Installs Complete, Install Complete NO PTO |
| Cancelled | 2,277 | Excluded |
| On Hold | 499 | Excluded |
| In Progress | 128 | Excluded |
| Not Ready | 123 | Excluded |
| Revision Complete - Review | 27 | Excluded |
| Revisions | 2 | Excluded |

### Cancellation Reason Values (3 unique):
| Reason | Count | Usage |
|--------|-------|-------|
| Customer Cancelled | 752 | Not filtered |
| **Duplicate Project (Error)** | **161** | **EXCLUDED FROM ALL KPIS** |
| Missing Required Docs/Info | 29 | Not filtered |

---

## 🎯 Implementation Checklist

### ✅ Ready to Implement Now:
- [ ] Update all cycle time calculations to use MEDIAN
- [ ] Add duplicate filtering to all KPIs
- [ ] Update Total Sales to JOIN project table
- [ ] Update Aveyo Approved to use customer-sow table
- [ ] Add period filtering to Jobs ON HOLD
- [ ] Add install-stage-status check to Install Complete NO PTO
- [ ] Update all date field references (packet-date, not packet-approval)
- [ ] Add period filtering standardization

### ⏳ Waiting for Database:
- [ ] A/R (M2/M3) - needs `accounting` table
- [ ] Revenue Received - needs `accounting` table
- [ ] Verify accounting table structure once available

### 🧪 Testing Required:
- [ ] Verify MEDIAN calculations work correctly in MySQL
- [ ] Test duplicate filtering on all KPIs
- [ ] Validate period filtering consistency
- [ ] Compare old vs new values for accuracy
- [ ] Test pull-through rate with new logic

---

## 💡 Key Insights

1. **161 duplicate projects** will be removed from all calculations - this may cause some KPI values to decrease
2. **MEDIAN vs AVERAGE** change will make cycle times more realistic (less affected by extreme outliers)
3. **Pull Through Rate** will be more accurate by filtering to the same time period as Total Sales
4. **Jobs ON HOLD** will now show period-specific values instead of all-time totals
5. **Financial KPIs** are blocked until `accounting` table is ready

---

## 📝 Questions for Next Steps

1. What is the date field in the `accounting` table for Revenue Received period filtering?
2. Should we create a migration script to test old vs new KPI values?
3. What is the expected timeline for the `accounting` table to be available?
4. Should we implement the changes incrementally or all at once?

---

**Document Updated:** December 16, 2025  
**Status:** Ready for Implementation (except financial KPIs pending `accounting` table)
