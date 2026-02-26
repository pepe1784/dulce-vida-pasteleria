import { useQuery } from "@tanstack/react-query";

export interface SiteSettings {
  whatsapp: string;
  instagram: string;
  facebook: string;
  google_maps: string;
  location_text: string;
  contact_email: string;
  phone: string;
  hours_weekdays: string;
  hours_sunday: string;
  hero_title: string;
  hero_subtitle: string;
  about_text: string;
  [key: string]: string;
}

export function useSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
