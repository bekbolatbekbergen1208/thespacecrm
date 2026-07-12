import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://crm.space";
  const paths = [
    "",
    "/auth",
    "/login",
    "/reset-password",
    "/onboarding",
    "/dashboard",
    "/dashboard/customers",
    "/dashboard/tasks",
    "/dashboard/analytics",
  ];

  return paths.map((path) => {
    const isHome = path === "";
    const changeFrequency = isHome ? "weekly" : "monthly";
    return {
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority: isHome ? 1 : 0.7,
    };
  });
}
