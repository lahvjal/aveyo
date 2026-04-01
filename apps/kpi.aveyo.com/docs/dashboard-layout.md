# KPI Dashboard Sections & Content  
*Technical Reference for Cursor Development*

This document provides detailed definitions, data requirements, and UI recommendations for every KPI in the dashboard. Use this as a reference while building your components, database queries, and API endpoints.

---

# ## 1 — Sales & Approval Pipeline

This section delivers a high-level snapshot of sales performance and approval efficiency.

### **KPIs**
- **Total Sales**  
  Number of residential contracts sold in the selected date range.

- **Total Sales Goal**  
  Target number of sales for the period (weekly, MTD, YTD).

- **Aveyo Approved**  
  Count of sales that have passed internal QA/validation.

- **Pull Through Rate**  
  `Aveyo Approved / Total Sales`  
  Shows the quality of sales and approval efficiency.

---

### **Display Recommendations**
- Four large KPI cards (top of the dashboard).
- Each KPI card should include:
  - Main value  
  - Trend vs previous period  
  - Mini sparkline (optional)  
  - Goal or % to goal (for goal-based metrics)

---

### **Filtering Behavior**
Filters modify which sales records are included:
- Current Week  
- Previous Week  
- MTD  
- YTD  
- Next Week  

All KPIs must recompute using date boundaries.

---

### **Developer Notes**
- Requires sales table access (Supabase or Podio sync).  
- Pull-through calculation is dynamic; do not store statically.  
- Good candidate for caching due to high visibility and use frequency.

---

# ## 2 — Install Operations

Operational throughput and bottleneck indicators. Measures how efficiently installs move through scheduling and completion.

### **KPIs**
- **Jobs Placed ON HOLD**  
  Jobs paused due to outstanding requirements (docs, AHJ, payments, etc.).

- **Installs Complete**  
  Total installations completed in the period.

- **Install Completion Goal**  
  Target number of installs to complete.

- **Install Complete NO PTO**  
  Installs finished but awaiting Permission to Operate.

- **Install Scheduled**  
  Future installations on calendar within the selected time period.

---

### **Display Recommendations**
- Grid layout with 5 KPI cards.  
- “On Hold” and “NO PTO” should visually stand out due to their operational importance.  
- Include progress bars for goal KPIs.

---

### **Filtering Behavior**
- Current Week → installs completed this week.  
- Next Week → scheduled installs in that upcoming week.

---

### **Developer Notes**
- Install-level data required from project milestone table.  
- PTO status often updates via utility or Podio webhook—store clean boolean or status code.  
- Jobs on hold must be mapped to a clear status (“HOLD”, “PENDING DOCS”, etc.).

---

# ## 3 — Cycle Times

Cycle times measure speed of progression through the project pipeline. This is the most critical operational performance indicator.

### **KPIs**
- **Avg Days PP → Install Start**  
  Time difference between Perfect Packet submission and install start.

- **Avg Days Install → M2 Approved**  
  Time between install completion and M2 milestone approval.

- **Avg Days PP → PTO**  
  Total time from PP submission to PTO.

- **Cycle Time Goals**  
  Typically:
  - PP → Install: ~21 days  
  - Install → M2: ~7 days  
  - PP → PTO: ~45 days  
  (Customize with org-specific targets.)

---

### **Display Recommendations**
- Three main KPI cards (cycle averages).  
- Under each: goal indicator + variance from goal.  
- Optional trendline chart (weekly or monthly view).

---

### **Filtering Behavior**
Cycle-time averages are calculated from:
- Timestamps in milestone records  
- Only jobs with both milestone timestamps count  
- Filters determine which jobs fall into the period

---

### **Developer Notes**
- Must compute time deltas using timestamps:  
  `DATEDIFF(install_date, pp_date)`, etc.  
- Create optimized SQL or Supabase RPC functions for averages.  
- Exclude incomplete jobs to avoid skew.

---

# ## 4 — Residential Financials

Tracks the financial state of residential operations including cash flow, pending payments, and risk items.

### **KPIs**
- **A/R (M2/M3 Submitted Not Received)**  
  Outstanding accounts receivable for milestones awaiting approval.

- **Revenue Received**  
  Payments received within the date range.

- **Install Complete M2 Not Approved ($)**  
  Financial backlog where install is done but milestone M2 is incomplete.

- **Total Holdback Outstanding**  
  Money withheld until all milestones pass.

- **Total DCA Outstanding**  
  Amount stuck in Document Control Audit, preventing approval/payment.

---

### **Display Recommendations**
- Financial summary cards grouped together.  
- Use currency formatting (`$50,000`).  
- Highlight backlogs (NO PTO, M2 incomplete, DCA) using subtle warning visual cues.

---

### **Filtering Behavior**
- Revenue Received → date-bound totals  
- Outstanding metrics → usually current-state values (clarify with ops)

---

### **Developer Notes**
- Requires financial sync from Podio, Quickbooks, or internal finance DB.  
- M2 backlog must join contract amount or payout tables.  
- Holdback and DCA may not follow date filtering—handle separately.

---

# ## 5 — Active Pipeline

Shows volume of projects actively progressing toward PTO.

### **KPI**
- **Active Pipeline (Active NO PTO)**  
  Count of all active jobs that haven’t achieved PTO and are not canceled/closed.

---

### **Display Recommendations**
- Single clear metric card.  
- Optionally paired with:
  - Historical pipeline count  
  - Week-over-week % change  

---

### **Filtering Behavior**
- If treated as a snapshot metric → ignore date filters  
- If historical reporting is desired → filter by changes in the period  
(Clarify with management.)

---

### **Developer Notes**
- Requires clear mapping of pipeline statuses.  
- Must exclude:
  - PTO-complete  
  - Canceled  
  - Rejected  
- Include only true active project flow stages.

---

# ## 6 — Commercial Division

Mirrors residential KPIs but based on KW capacity instead of job count.

### **KPIs**
- **Total KW Scheduled**  
  KW capacity scheduled in the given period.

- **KW Scheduled Goal**  
  Target scheduled KW.

- **Total KW Installed**  
  KW capacity actually installed.

- **KW Installed Goal**  
  Target installed KW.

- **A/R (Commercial)**  
  Outstanding accounts receivable for commercial projects.

- **Revenue Received (Commercial)**  
  Commercial revenue collected in the period.