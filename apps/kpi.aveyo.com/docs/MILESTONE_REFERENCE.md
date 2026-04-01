# Aveyo Customer Portal - Database Milestones Reference

This document lists all milestones tracked in the MySQL database for the Aveyo Customer Portal project tracking system.

## Overview

Milestone data is stored in the **`timeline`** table in the MySQL database. Each project has milestone dates and status fields that track progress through four main stages:

1. **Pre-Approvals**
2. **Approvals**
3. **Construction**
4. **Activation** (also referred to as "Energization")

---

## Pre-Approvals Stage

These milestones occur at the beginning of the project, covering initial site assessment and engineering work.

### Site Survey Milestones

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Site Survey Status | `site-survey-status` | String | Current status of the site survey (e.g., Scheduled, Complete) | `timeline` |
| Site Survey Appointment | `site-survey-appointment` | DateTime | Scheduled date/time for the site survey visit | `timeline` |
| Site Survey Complete | `site-survey-complete` | DateTime | Date when the site survey was completed | `timeline` |

**Customer-Facing Name:** "Site Survey"

### Notice to Proceed (NTP)

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| NTP Complete | `ntp-complete` | DateTime | Date when Notice to Proceed was approved by financing | `timeline` |

**Customer-Facing Name:** "Notice to Proceed approved by financing"

### Engineering & Design

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Design Status | `design-status` | String | Current status of the design phase | `timeline` |
| CAD Complete | `cad-complete` | DateTime | Date when Computer-Aided Design was completed | `timeline` |
| Engineering Complete | `engineering-complete` | DateTime | Date when engineering work was finalized | `timeline` |

**Customer-Facing Name:** "Engineering"

### Rep Scope Approval

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Rep Scope Approval Status | `rep-scope-approval-status` | String | Current status of sales rep scope approval | `timeline` |
| Rep Scope Approved | `rep-scope-approved` | DateTime | Date when sales rep approved the project scope | `timeline` |

---

## Approvals Stage

These milestones cover all regulatory and utility approvals required before installation.

### Utility Approvals

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Utility Status | `utility-status` | String | Current status of utility company approval process | `timeline` |
| Utility Application Submitted | `utility-application-submitted` | DateTime | Date when application was submitted to utility company | `timeline` |
| Utility Application Approved | `utility-application-approved` | DateTime | Date when utility company approved the application | `timeline` |

### Building Permits

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Permit Status | `permit-status` | String | Overall permit status | `timeline` |
| Building Permit Submitted | `building-permit-submitted` | DateTime | Date when building permit was submitted to AHJ | `timeline` |
| Building Permit Approved | `building-permit-approved` | DateTime | Date when building permit was approved | `timeline` |

### Electrical Permits

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Electrical Permit Submitted | `electricla-permit-submitted` | DateTime | Date when electrical permit was submitted (note: field has typo in DB) | `timeline` |
| Electrical Permit Approved | `electrical-permit-approved` | DateTime | Date when electrical permit was approved | `timeline` |

### Additional Permits

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Zoning Permit Submitted | `zoning-permit-submitted` | DateTime | Date when zoning permit was submitted | `timeline` |
| Zoning Permit Approved | `zoning-permit-approved` | DateTime | Date when zoning permit was approved | `timeline` |
| Additional Permit Submitted | `additional-permit-submitted` | DateTime | Date when any additional permits were submitted | `timeline` |
| Additional Permit Approved | `additional-permit-approved` | DateTime | Date when additional permits were approved | `timeline` |

### All Permits Complete

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| All Permits Complete | `all-permits-complete` | DateTime | Date when all required permits were obtained | `timeline` |

**Customer-Facing Name:** "All city and utility approvals submitted"

### HOA Approval

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| HOA Yes/No | `hoa-yes-no` | String | Indicates if HOA approval is required (Yes/No) | `timeline` |
| HOA Status | `hoa-status` | String | Current status of HOA approval process | `timeline` |
| HOA Approved Date | `hoa-approved-date` | DateTime | Date when HOA approved the installation | `timeline` |

### Equipment & Installation Readiness

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Equipment Ordered | `equipment-ordered` | DateTime | Date when solar equipment was ordered | `timeline` |
| Install Ready | `install-ready` | String | Status indicator if project is ready for installation (e.g., "Yes") | `timeline` |
| Install Ready Date | `install-ready-date` | DateTime | Date when project became ready for installation | `timeline` |

---

## Construction Stage

These milestones track the physical installation of the solar system.

### Installation Scheduling

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Install Stage Status | `install-stage-status` | String | Current status of the installation stage | `timeline` |
| Estimated Install Date | `estimated-install-date` | DateTime | Estimated date for installation to begin | `timeline` |
| Install Appointment | `install-appointment` | DateTime | Confirmed appointment date for installation | `timeline` |

**Customer-Facing Name:** "Confirmed Install Appointment Date"

### Installation Work

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Panel Install Complete | `panel-install-complete` | DateTime | Date when solar panel installation was completed | `timeline` |
| Electrical Work Status | `electrical-work-status` | String | Current status of electrical work | `timeline` |
| MPU Complete | `mpu-complete` | DateTime | Date when Main Panel Upgrade was completed (if required) | `timeline` |
| Electrical Work Complete | `electrical-work-complete` | DateTime | Date when all electrical work was completed | `timeline` |
| Install Complete | `install-complete` | DateTime | Date when installation was substantially complete | `timeline` |

**Customer-Facing Name:** "Install Substantial Completion"

### Photo Audit & Quality Control

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Photo Audit | `photo-audit` | String | Status of installation photo audit (e.g., "Pass", "Fail") | `timeline` |

### Inspections

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Inspection Status | `inspection-status` | String | Current status of inspection process | `timeline` |
| AHJ Inspection Appointment | `ahj-inspection-appointment` | DateTime | Scheduled date for Authority Having Jurisdiction inspection | `timeline` |
| AHJ Inspection Complete | `ahj-inspection-complete` | DateTime | Date when AHJ inspection was completed and passed | `timeline` |

**Customer-Facing Name:** "City and/or Utility Inspections"

---

## Activation Stage (Energization)

These are the final milestones when the system goes live and begins producing energy.

### Permission to Operate (PTO)

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| PTO Status | `pto-status` | String | Current status of Permission to Operate application | `timeline` |
| PTO Submitted | `pto-submitted` | DateTime | Date when PTO application was submitted to utility | `timeline` |
| PTO Received | `pto-received` | DateTime | Date when PTO was received from utility company | `timeline` |

**Customer-Facing Name:** "Permission To Operate Received from Utility Company"

### System Activation

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Energize Status | `energize-status` | String | Current status of system energization process | `timeline` |
| System Active | `system-active` | DateTime | Date when the solar system was activated | `timeline` |
| Energize Complete Date | `energize-complete-date` | DateTime | Date when energization process was completed | `timeline` |

**Customer-Facing Name:** "System Active and Producing"

### Project Completion

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Project Complete | `project-complete` | DateTime | Date when the entire project was marked as complete | `timeline` |

---

## Additional Project Milestones (from `project-data` table)

These milestones are stored in the main `project-data` table rather than the `timeline` table.

### Financing Milestones

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| M1 Submitted | `m1-submitted` | DateTime | Milestone 1 payment submitted to lender | `project-data` |
| M1 Approved | `m1-approved` | DateTime | Milestone 1 payment approved by lender | `project-data` |
| M1 Earned Date | `m1-earned-date` | DateTime | Date when M1 payment was earned | `project-data` |
| M1 Received Date | `m1-received-date` | DateTime | Date when M1 payment was received | `project-data` |
| M2 Submitted | `m2-submitted` | DateTime | Milestone 2 payment submitted to lender | `project-data` |
| M2 Approved | `m2-approved` | DateTime | Milestone 2 payment approved by lender | `project-data` |
| M2 Earned Date | `m2-earned-date` | DateTime | Date when M2 payment was earned | `project-data` |
| M2 Received Date | `m2-received-date` | DateTime | Date when M2 payment was received | `project-data` |
| M3 Submitted | `m3-submitted` | DateTime | Milestone 3 payment submitted to lender | `project-data` |
| M3 Approved | `m3-approved` | DateTime | Milestone 3 payment approved by lender | `project-data` |

### Contract & Initial Milestones

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Contract Signed | `contract-signed` | DateTime | Date when customer signed the contract | `timeline` |
| Packet Approval | `packet-approval` | DateTime | Date when initial packet was approved | `timeline` |

### Cancellation

| Milestone Name | Database Field | Field Type | Description | Table |
|----------------|----------------|------------|-------------|-------|
| Cancellation Date | `cancellation-date` | DateTime | Date when project was cancelled (if applicable) | `timeline` |
| Cancellation Reason | `cancellation-reason` | String (Text) | Reason for project cancellation | `timeline` |

---

## Customer Action Items (from `project-data` and `customer-sow` tables)

These are not traditional milestones but action items customers need to complete.

### Virtual Welcome Call (VWC)

| Field Name | Database Field | Field Type | Description | Table |
|------------|----------------|------------|-------------|-------|
| VWC Status | `vwc-status` | String | Status of Virtual Welcome Call form | `project-data` |
| VWC Form URL | `vwc-form-url` | String (Text) | URL to the welcome form | `project-data` |
| VWC Complete Date | `vwc-complete-date` | DateTime | Date when VWC form was completed | `project-data` |

**Action Item Type:** `welcome_form`

### Customer Statement of Work (SOW)

| Field Name | Database Field | Field Type | Description | Table |
|------------|----------------|------------|-------------|-------|
| Customer SOW Status | `customer-sow-status` | String | Status of SOW approval | `project-data` |
| Customer SOW Form URL | `customer-sow-form-url` | String (Text) | URL to the SOW form | `project-data` |
| Customer SOW Due Date | `customer-sow-due-date` | DateTime | Due date for customer SOW approval | `project-data` |
| Customer SOW Complete Date | `customer-sow-complete-date` | DateTime | Date when customer completed SOW | `project-data` |

**Additional fields in `customer-sow` table:**

| Field Name | Database Field | Field Type | Description | Table |
|------------|----------------|------------|-------------|-------|
| Title | `title` | String (Text) | Title of the SOW | `customer-sow` |
| Status | `status` | String | Current status | `customer-sow` |
| Customer Approval | `customer-approval` | String | Customer approval status | `customer-sow` |
| Link to Scope Approval Form | `link-to-scope-approval-form` | String (Text) | URL to approval form | `customer-sow` |
| SOW Sent Timestamp | `sow-sent-timestamp` | DateTime | When SOW was sent to customer | `customer-sow` |
| SOW Approved Timestamp | `sow-approved-timestamp` | DateTime | When customer approved SOW | `customer-sow` |
| Customer Portal SOW Status | `customer-portal-sow-status` | String | SOW status for customer portal | `customer-sow` |
| Customer SOW Due Date | `customer-sow-due-date` | DateTime | Due date for SOW approval | `customer-sow` |

**Action Item Type:** `sow_approval`

---

## Database Schema Notes

1. **Primary Timeline Table:** Most milestone dates are stored in the `timeline` table
2. **Relationship:** Timeline records are linked to projects via the `project-id` field
3. **Data Types:**
   - **DateTime fields:** Store actual date/time when milestone was completed
   - **String fields:** Store status values (e.g., "Complete", "In Progress", "Pending")
4. **Field Naming Convention:** Database uses kebab-case (e.g., `site-survey-complete`)
5. **Typo Note:** The field `electricla-permit-submitted` has a typo in the database schema

---

## Milestone Mapping in Code

The application maps these database fields to customer-friendly names and organizes them into four sections:

### Mapped Fields (from `field-mapper.ts`)

**Pre-Approvals:**
- `site-survey-complete` → "Site Survey"
- `ntp-complete` → "Notice to Proceed approved by financing"
- `engineering-complete` → "Engineering"

**Approvals:**
- `all-permits-complete` → "All city and utility approvals submitted"

**Construction:**
- `install-appointment` → "Confirmed Install Appointment Date"
- `install-complete` → "Install Substantial Completion"
- `ahj-inspection-complete` → "City and/or Utility Inspections"

**Activation:**
- `pto-received` → "Permission To Operate Received from Utility Company"
- `energize-complete-date` → "System Active and Producing"

---

## Progress Calculation

The customer portal uses these milestones to:

1. **Calculate Project Progress:** Determines which stage is current and percentage complete
2. **Display Progress Bar:** Shows visual representation of project advancement
3. **Identify Next Steps:** Highlights the next milestone for the customer
4. **Generate Notifications:** Creates alerts when milestones are reached

---

## Related Documentation

- **Database Schema:** `/prisma/schema.prisma`
- **Field Mapping Logic:** `/src/lib/mysql/field-mapper.ts`
- **Milestone Display Names:** `/src/utils/milestoneUtils.ts`
- **Status Calculation:** `/src/utils/projectStatusUtils.ts`

---

*Last Updated: February 7, 2026*
*Database: MySQL hosted on Digital Ocean*
*Application: Aveyo Customer Portal (Next.js 15)*
