import type { KPISection, KPIDefinition } from '@/types/kpi';
import { authApiRequest } from '@/lib/auth/session';

interface SectionOrderRow {
  section_id: string;
  display_order: number;
  is_active: boolean;
}

interface DashboardKpiRow {
  id?: string;
  kpi_id?: string;
  name: string;
  description?: string | null;
  format: "number" | "currency" | "percentage" | "days";
  available_periods?: string[];
  availablePeriods?: string[];
  section_id?: string;
  show_goal?: boolean;
  showGoal?: boolean;
  is_hidden?: boolean;
}

interface KpisApiPayload {
  success: boolean;
  kpis?: {
    builtIn?: DashboardKpiRow[];
    custom?: DashboardKpiRow[];
  };
}

interface SectionsApiPayload {
  success: boolean;
  sections?: SectionOrderRow[];
}

/**
 * Fetch KPI sections dynamically from database
 * 
 * This function fetches all active, non-hidden KPIs from Supabase
 * and organizes them into sections for display on the dashboard.
 * 
 * Usage: Call this instead of importing DASHBOARD_SECTIONS after migration is complete
 */
export async function getDashboardSections(): Promise<KPISection[]> {
  try {
    const [kpisResponse, sectionsResponse] = await Promise.all([
      authApiRequest<KpisApiPayload>('/api/kpis'),
      authApiRequest<SectionsApiPayload>('/api/sections').catch(
        (): SectionsApiPayload => ({ success: false, sections: [] })
      )
    ]);

    const builtIn = kpisResponse.kpis?.builtIn ?? [];
    const custom = kpisResponse.kpis?.custom ?? [];
    const rowById = new Map<string, DashboardKpiRow>();

    for (const row of [...builtIn, ...custom]) {
      const id = row.kpi_id ?? row.id;
      if (!id) {
        continue;
      }
      rowById.set(id, row);
    }

    const kpis = Array.from(rowById.values()).filter((row) => !row.is_hidden);
    if (kpis.length === 0) {
      return [];
    }

    // Group KPIs by section
    const sectionMap = new Map<string, DashboardKpiRow[]>();
    
    for (const kpi of kpis) {
      const sectionId = kpi.section_id;
      if (!sectionId) {
        continue;
      }
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, []);
      }
      sectionMap.get(sectionId)!.push(kpi);
    }

    // Determine section order (from database or fallback to default)
    let sectionOrder: string[];
    
    if (sectionsResponse.success && sectionsResponse.sections && sectionsResponse.sections.length > 0) {
      // Use order from database
      sectionOrder = sectionsResponse.sections
        .filter((section) => section.is_active)
        .sort((a, b) => a.display_order - b.display_order)
        .map((section) => section.section_id);
    } else {
      // Fallback to default order
      sectionOrder = [
        'sales_stats',
        'operations_stats',
        'cycle_times',
        'residential_financials',
        'active_pipeline',
        'finance',
        'commercial'
      ];
    }

    // Convert to KPISection format in the correct order
    const sections: KPISection[] = [];
    
    // First, add sections in the defined order
    for (const sectionId of sectionOrder) {
      if (sectionMap.has(sectionId)) {
        const sectionKpis = sectionMap.get(sectionId)!;
        const kpiDefinitions: KPIDefinition[] = sectionKpis.map(kpi => ({
          id: kpi.kpi_id ?? kpi.id ?? '',
          name: kpi.name,
          description: kpi.description || undefined,
          format: kpi.format,
          availablePeriods: (kpi.available_periods ?? kpi.availablePeriods ?? []) as any[],
          isHighlighted: false, // TODO: Add to database schema if needed
          showGoal: kpi.show_goal ?? kpi.showGoal ?? false,
          hidden: kpi.is_hidden ?? false,
          calculationMeta: undefined // TODO: Could be stored in field_mappings
        }));

        sections.push({
          id: sectionId,
          title: formatSectionTitle(sectionId),
          description: getSectionDescription(sectionId),
          kpis: kpiDefinitions
        });
      }
    }
    
    // Then add any remaining sections not in the standard order
    Array.from(sectionMap.entries()).forEach(([sectionId, sectionKpis]) => {
      if (!sectionOrder.includes(sectionId)) {
        const kpiDefinitions: KPIDefinition[] = sectionKpis.map(kpi => ({
          id: kpi.kpi_id ?? kpi.id ?? '',
          name: kpi.name,
          description: kpi.description || undefined,
          format: kpi.format,
          availablePeriods: (kpi.available_periods ?? kpi.availablePeriods ?? []) as any[],
          isHighlighted: false,
          showGoal: kpi.show_goal ?? kpi.showGoal ?? false,
          hidden: kpi.is_hidden ?? false,
          calculationMeta: undefined
        }));

        sections.push({
          id: sectionId,
          title: formatSectionTitle(sectionId),
          description: getSectionDescription(sectionId),
          kpis: kpiDefinitions
        });
      }
    });

    return sections;
  } catch (error) {
    console.error('Error in getDashboardSections:', error);
    return [];
  }
}

/**
 * Get dashboard sections with fallback to hardcoded sections
 * 
 * This function first tries to fetch from database, and if no KPIs
 * are found (or on error), falls back to the hardcoded sections.
 * 
 * Use this during migration period to ensure dashboard always works.
 */
export async function getDashboardSectionsWithFallback(): Promise<KPISection[]> {
  // Try to fetch from database
  const dbSections = await getDashboardSections();
  
  // If database has KPIs, use them
  if (dbSections.length > 0) {
    return dbSections;
  }
  
  // Otherwise fall back to hardcoded sections
  const { DASHBOARD_SECTIONS } = await import('@/types/kpi');
  return DASHBOARD_SECTIONS;
}

/**
 * Format section ID to human-readable title
 */
function formatSectionTitle(sectionId: string): string {
  const titleMap: Record<string, string> = {
    'sales_stats': 'Sales Stats',
    'operations_stats': 'Operations Stats',
    'cycle_times': 'Cycle Times',
    'residential_financials': 'Residential Financials',
    'active_pipeline': 'Active Pipeline',
    'finance': 'Finance',
    'commercial': 'Commercial Division'
  };

  return titleMap[sectionId] || sectionId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get section description
 */
function getSectionDescription(sectionId: string): string | undefined {
  const descriptionMap: Record<string, string> = {
    'sales_stats': 'Sales performance, rep activity, and conversion metrics',
    'operations_stats': 'Installation throughput, cycle times, and operational bottlenecks',
    'cycle_times': 'Speed of progression through the project pipeline',
    'residential_financials': 'Financial state including cash flow and pending payments',
    'active_pipeline': 'Projects actively progressing toward PTO',
    'finance': 'Financial tracking for milestone payment milestones and receivables',
    'commercial': 'Commercial KPIs based on KW capacity'
  };

  return descriptionMap[sectionId];
}

/**
 * Merge database KPIs with hardcoded KPIs
 * 
 * During migration, some KPIs will be in database and some still in code.
 * This function merges them, with database KPIs taking precedence.
 */
export async function getMergedDashboardSections(): Promise<KPISection[]> {
  // Fetch database KPIs
  const dbSections = await getDashboardSections();
  
  // Get hardcoded KPIs
  const { DASHBOARD_SECTIONS } = await import('@/types/kpi');
  
  // If no database KPIs, return hardcoded
  if (dbSections.length === 0) {
    return DASHBOARD_SECTIONS;
  }
  
  // Create map of database KPI IDs
  const dbKpiIds = new Set<string>();
  for (const section of dbSections) {
    for (const kpi of section.kpis) {
      dbKpiIds.add(kpi.id);
    }
  }
  
  // Create merged sections
  const mergedSections: KPISection[] = [];
  const sectionMap = new Map<string, KPISection>();
  
  // Add all database sections
  for (const section of dbSections) {
    sectionMap.set(section.id, section);
  }
  
  // Add hardcoded sections and merge KPIs
  for (const section of DASHBOARD_SECTIONS) {
    if (sectionMap.has(section.id)) {
      // Section exists in database, add missing hardcoded KPIs
      const existingSection = sectionMap.get(section.id)!;
      const additionalKpis = section.kpis.filter(kpi => !dbKpiIds.has(kpi.id));
      existingSection.kpis.push(...additionalKpis);
    } else {
      // Section doesn't exist in database, add entire section
      sectionMap.set(section.id, section);
    }
  }
  
  // Convert map to array and sort by standard order
  const sectionOrder = [
    'sales_stats',
    'operations_stats',
    'cycle_times',
    'residential_financials',
    'active_pipeline',
    'finance',
    'commercial'
  ];
  
  for (const sectionId of sectionOrder) {
    if (sectionMap.has(sectionId)) {
      mergedSections.push(sectionMap.get(sectionId)!);
    }
  }
  
  // Add any remaining sections not in standard order
  Array.from(sectionMap.entries()).forEach(([sectionId, section]) => {
    if (!sectionOrder.includes(sectionId)) {
      mergedSections.push(section);
    }
  });
  
  return mergedSections;
}
