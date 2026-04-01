# KPI Calculation Details Modal
**Date:** December 16, 2025  
**Last Updated:** December 16, 2025 (Modal Update)  
**Status:** ✅ Complete - Ready for Testing

---

## 🎯 Overview

Added informative **centered modal dialogs** to all 26 KPI cards showing:
- **Calculation**: Plain English explanation of how the KPI is calculated
- **Data Sources**: Database tables and fields used
- **Formula**: SQL-like formula showing the exact calculation
- **Notes**: Additional context, warnings, or limitations

---

## 📋 Files Created/Modified

### **New Files:**

1. **`src/components/ui/tooltip.tsx`** - Modal component (formerly tooltip)
   - **Click-triggered** centered modal (no hover behavior)
   - **Viewport-centered** with backdrop overlay
   - **Keyboard accessible** (ESC to close)
   - **Click-outside to close**
   - Dark theme for contrast
   - Prevents body scroll when open

### **Modified Files:**

1. **`src/types/kpi.ts`**
   - Added `KPICalculationMeta` interface
   - Updated `KPIDefinition` to include `calculationMeta`
   - Added calculation metadata for all 26 KPIs

2. **`src/components/kpi-card.tsx`**
   - Added `calculationMeta` prop
   - Integrated modal trigger in header
   - Shows info icon next to KPI title

3. **`src/components/kpi-section.tsx`**
   - Passes `calculationMeta` to `KPICard`

---

## 🎨 Modal Features

### **Visual Design:**
- **Centered viewport positioning** with backdrop overlay
- **Dark background** (slate-900) for high contrast
- **Light text** (white/slate-300) for readability
- **Color coding**:
  - Blue for section numbers and table names
  - Yellow for warning notes
  - Monospace font for SQL formulas and field names
- **Numbered sections** (1, 2, 3) for easy scanning
- **Smooth animations** (fade-in, zoom-in, slide-up)
- **Close button** (X) in top-right corner

### **Behavior:**
- **Click to open**: Click info icon (ℹ️) to open modal
- **Click to close**: Click X button, backdrop, or press ESC
- **Centered**: Always centered in viewport
- **Scrollable**: Content scrolls if too tall (max 80vh)
- **Body scroll lock**: Prevents background scrolling when open
- **Max width**: 768px (2xl breakpoint)
- **Responsive padding**: 1rem on mobile
- **z-index**: 50 (appears above all other content)
- **Backdrop**: Semi-transparent black with blur effect

---

## 📊 Calculation Metadata Added

### **Sales & Approval Pipeline (4 KPIs)**

#### Total Sales
```typescript
calculation: "Counts all signed contracts in the selected period, excluding cancelled projects and duplicates."
dataSources: [timeline, project-data]
formula: "COUNT(*) WHERE contract-signed IS NOT NULL AND project-status != 'Cancelled'"
notes: "Filters out 161 duplicate projects and all cancelled projects."
```

#### Aveyo Approved
```typescript
calculation: "Counts distinct projects with an approved Scope of Work (SOW) timestamp, excluding cancelled projects."
dataSources: [customer-sow, project-data]
formula: "COUNT(DISTINCT project-id) WHERE sow-approved-timestamp IS NOT NULL"
notes: "Uses simple project-id field (not project-dev-id) for joining."
```

#### Pull Through Rate
```typescript
calculation: "Percentage of sales that remain active in the pipeline."
dataSources: [timeline, project-data]
formula: "(COUNT(Active + Complete + Pre-Approvals + New Lender + Finance Hold) / Total Sales) × 100"
notes: "Measures retention rate of signed contracts through the pipeline."
```

---

### **Install Operations (5 KPIs)**

#### Jobs ON HOLD
```typescript
calculation: "Counts all projects with 'On Hold' status, excluding duplicates."
dataSources: [project-data, timeline]
formula: "COUNT(*) WHERE project-status = 'On Hold'"
notes: "Currently 276 projects on hold. Highlighted to draw attention to bottlenecks."
```

#### Installs Complete
```typescript
calculation: "Counts installations marked as complete within the period, filtering out duplicates."
dataSources: [timeline]
formula: "COUNT(*) WHERE install-complete IS NOT NULL AND install-stage-status = 'Complete'"
notes: "Only counts installs with stage status 'Complete' (3,003 total records)."
```

#### Install Complete NO PTO
```typescript
calculation: "Counts completed installations that have not yet received Permission to Operate (PTO)."
dataSources: [timeline]
formula: "COUNT(*) WHERE install-complete IS NOT NULL AND pto-received IS NULL AND install-stage-status = 'Complete'"
notes: "Highlighted as a bottleneck indicator. Filtered by install-complete date within period."
```

#### Install Scheduled
```typescript
calculation: "Counts all installations scheduled within the selected period."
dataSources: [timeline]
formula: "COUNT(*) WHERE install-appointment IS NOT NULL AND install-appointment IN [period]"
notes: "Shows upcoming workload for installation teams."
```

---

### **Cycle Times (3 KPIs)**

All three cycle time KPIs include:
```typescript
notes: "TODO: Update to MEDIAN for more accurate representation. Only X% of projects have this data."
```

#### PP → Install Start
```typescript
calculation: "Average number of days between Perfect Packet approval and installation appointment. Lower is better."
dataSources: [timeline]
formula: "AVG(DATEDIFF(install-appointment, packet-approval)) WHERE both dates are NOT NULL"
notes: "TODO: Update to MEDIAN. Only 37.7% of projects have packet-approval dates (2,285 records)."
```

#### Install → M2 Approved
```typescript
calculation: "Average number of days between installation appointment and M2 milestone approval. Lower is better."
dataSources: [timeline, project-data]
formula: "AVG(DATEDIFF(m2-approved, install-appointment)) WHERE both dates are NOT NULL"
notes: "TODO: Update to MEDIAN. M2-approved coverage: 47.7% (2,893 records)."
```

#### PP → PTO
```typescript
calculation: "Average total cycle time from Perfect Packet approval to Permission to Operate. Lower is better."
dataSources: [timeline]
formula: "AVG(DATEDIFF(pto-received, packet-approval)) WHERE both dates are NOT NULL"
notes: "TODO: Update to MEDIAN. Complete cycle time metric. PTO-received coverage: 44.8% (2,713 records)."
```

---

### **Residential Financials (5 KPIs)**

#### A/R (M2/M3)
```typescript
calculation: "Sum of M2 (80% of contract) and M3 (20% of contract) amounts that have been submitted but not yet received."
dataSources: [accounting (pending), project-data]
formula: "SUM(contract-price * 0.8 WHERE M2 submitted NOT received) + SUM(contract-price * 0.2 WHERE M3 submitted NOT received)"
notes: "⚠️ Awaiting accounting table implementation. M2 = 80%, M3 = 20% of contract price."
```

#### Install M2 Not Approved
```typescript
calculation: "Sum of M2 milestone amounts (80% of contract price) for completed installations that haven't received M2 approval."
dataSources: [timeline, project-data]
formula: "SUM(contract-price * 0.8) WHERE install-complete IS NOT NULL AND m2-approved IS NULL"
notes: "Highlighted to show financial bottleneck. Represents money ready to bill but paperwork incomplete."
```

#### Total Holdback & Total DCA
```typescript
notes: "⚠️ Data source not yet identified in database schema."
```

---

### **Active Pipeline (1 KPI)**

#### Active NO PTO
```typescript
calculation: "Counts all projects with active statuses that have not yet received Permission to Operate (PTO)."
dataSources: [project-data, timeline]
formula: "COUNT(*) WHERE project-status IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold') AND pto-received IS NULL"
notes: "No time period filter - shows all active projects without PTO. Excludes duplicates and cancelled projects."
```

---

### **Commercial Division (6 KPIs)**

#### Total KW Scheduled
```typescript
calculation: "Sum of system sizes (in KW) for installations scheduled but not yet completed in the period."
dataSources: [timeline, project-data]
formula: "SUM(system-size) WHERE install-appointment IN [period] AND install-complete IS NULL"
notes: "Measures planned installation capacity. Excludes duplicates."
```

#### Total KW Installed
```typescript
calculation: "Sum of system sizes (in KW) for installations completed within the period."
dataSources: [timeline, project-data]
formula: "SUM(system-size) WHERE install-complete IN [period]"
notes: "Measures actual installation capacity delivered. System-size has 100% coverage."
```

#### Commercial A/R & Revenue
```typescript
notes: "⚠️ Commercial filter not yet implemented. Currently shows same as residential."
```

---

## 🎯 Usage

### **For Users:**
1. **Click** the info icon (ℹ️) next to any KPI title
2. **Modal opens** centered on screen showing calculation details
3. **Close** by:
   - Clicking the X button in top-right
   - Clicking outside the modal (on backdrop)
   - Pressing ESC key
4. **Scroll** within modal if content is long

### **For Developers:**
To add/update modal content for a KPI:

1. Open `src/types/kpi.ts`
2. Find the KPI definition in `DASHBOARD_SECTIONS`
3. Update the `calculationMeta` object:

```typescript
{
  id: "your_kpi_id",
  name: "Your KPI Name",
  // ... other properties
  calculationMeta: {
    calculation: "Plain English explanation",
    dataSources: [
      {
        table: "table_name",
        fields: ["field1", "field2"]
      }
    ],
    formula: "SQL-like formula",
    notes: "Optional additional context or warnings"
  }
}
```

---

## ✅ Testing Checklist

- [ ] Modals open on click (not hover)
- [ ] Modals are centered in viewport
- [ ] All 26 KPIs have modals
- [ ] Close button works (X in top-right)
- [ ] ESC key closes modal
- [ ] Click outside (backdrop) closes modal
- [ ] Body scroll is locked when modal is open
- [ ] Modal content is scrollable if needed
- [ ] Formula text is readable and wraps properly
- [ ] Table names are highlighted in blue
- [ ] Section numbers (1, 2, 3) are visible
- [ ] Warning notes are highlighted in yellow
- [ ] Modals work on mobile devices
- [ ] Info icons don't interfere with trend badges
- [ ] Backdrop blur effect is visible
- [ ] Animations are smooth

---

## 📱 Responsive Behavior

- **Desktop**: Click to open, centered modal, max-width 768px
- **Tablet**: Click to open, full-width with padding
- **Mobile**: Click to open, full-width with 1rem padding
- **All devices**: Viewport-centered, scrollable content, backdrop overlay
- **Touch-friendly**: Large close button, click-outside to close

---

## 🎨 Styling Details

### **Modal Container:**
- Background: `bg-slate-900`
- Text: `text-white`
- Border radius: `rounded-lg`
- Shadow: `shadow-2xl`
- Padding: `p-6 pr-12` (extra right padding for close button)
- Max width: `max-w-2xl` (768px)
- Max height: `max-h-[80vh]`
- Position: `fixed inset-0` with flex centering

### **Backdrop:**
- Background: `bg-black/50` with `backdrop-blur-sm`
- Click handler for close on outside click
- z-index: 50

### **Content Sections:**
- **Title**: Text-xl, bold, with subtitle
- **Section Numbers**: Blue-500 circles with white text
- **Calculation**: White heading, slate-300 description, left margin
- **Data Sources**: Slate-800 background cards, blue-400 table names, monospace fields
- **Formula**: Slate-800 background, monospace font, word-wrap enabled
- **Notes**: Yellow warning box with yellow-400 heading and info icon

### **Info Icon:**
- Size: `h-4 w-4`
- Color: `text-slate-400` (default), `text-slate-600` (hover)
- Cursor: `cursor-pointer`
- Transition: Color transition on hover
- Focus ring: Blue ring on keyboard focus

### **Close Button:**
- Position: `absolute top-4 right-4`
- Size: X icon `h-5 w-5`
- Hover: `hover:bg-slate-800`
- Focus ring: Blue ring on keyboard focus

---

## 🚀 Future Enhancements

1. **Add examples**: Show sample calculations with actual data
2. **Add links**: Link to related KPIs or documentation
3. **Add visuals**: Include small diagrams for complex calculations
4. **Add history**: Show how the calculation has changed over time
5. **Copy to clipboard**: Allow copying formula text
6. **Print view**: Add print-friendly version of calculation details
7. **Share link**: Deep link to specific KPI modal
8. **Expand all**: Button to view all calculations at once

---

## 📊 Impact

### **For Users:**
- ✅ **Transparency**: Users can see exactly how each metric is calculated
- ✅ **Trust**: Understanding the data sources builds confidence
- ✅ **Education**: Learn about the business metrics and database structure
- ✅ **Debugging**: Quickly identify why a number might be unexpected
- ✅ **Better UX**: Click-to-open is more intentional and touch-friendly
- ✅ **Focused reading**: Centered modal with backdrop reduces distractions
- ✅ **Accessibility**: Keyboard navigation and proper focus management

### **For Developers:**
- ✅ **Documentation**: Calculation logic is documented in code
- ✅ **Maintenance**: Easy to update when formulas change
- ✅ **Onboarding**: New developers can understand the system faster
- ✅ **Debugging**: Clear mapping between UI and database queries

---

## 🔄 Recent Updates

### **December 16, 2025 - Modal Conversion**
- ✅ Converted hover tooltips to click-triggered modals
- ✅ Centered modal positioning with backdrop overlay
- ✅ Added ESC key and click-outside to close
- ✅ Enhanced visual design with numbered sections
- ✅ Improved content layout and spacing for modal format
- ✅ Added body scroll lock when modal is open
- ✅ Better mobile experience with larger touch targets

---

**Status:** ✅ Complete and ready for use!

**All 26 KPIs now have informative click-to-open modals with detailed calculation information.** 🎉
