export const BUSINESS_INDUSTRIES = [
  "Retail Store",
  "Robotics Education",
  "Bakery",
  "Manufacturing",
  "Education Center",
  "Restaurant / Cafe",
  "Clinic / Healthcare",
  "Logistics",
  "Service Business",
  "Construction",
  "Real Estate",
  "Other",
] as const;

export type BusinessIndustry = (typeof BUSINESS_INDUSTRIES)[number];

export const INDUSTRY_DASHBOARD_ROUTES: Record<BusinessIndustry, string> = {
  "Retail Store": "/dashboard/retail",
  "Robotics Education": "/dashboard/education",
  Bakery: "/dashboard/bakery",
  Manufacturing: "/dashboard/bakery",
  "Education Center": "/dashboard/education",
  "Restaurant / Cafe": "/dashboard/restaurant",
  "Clinic / Healthcare": "/dashboard/clinic",
  Logistics: "/dashboard/logistics",
  "Service Business": "/dashboard/service",
  Construction: "/dashboard/construction",
  "Real Estate": "/dashboard/real-estate",
  Other: "/dashboard/other",
};

const legacyIndustryMap: Record<string, BusinessIndustry> = {
  "Educational Center": "Education Center",
  "Healthcare / Clinic": "Clinic / Healthcare",
  "Service Company": "Service Business",
  Manufacturing: "Manufacturing",
  "Production Business": "Manufacturing",
  "Производственный бизнес": "Manufacturing",
};

export function normalizeIndustry(industry?: string | null): BusinessIndustry {
  if (!industry) return "Other";
  if (BUSINESS_INDUSTRIES.includes(industry as BusinessIndustry)) return industry as BusinessIndustry;
  return legacyIndustryMap[industry] ?? "Other";
}

export function dashboardRouteForIndustry(industry?: string | null) {
  return INDUSTRY_DASHBOARD_ROUTES[normalizeIndustry(industry)];
}
