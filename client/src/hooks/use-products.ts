import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useProducts() {
  return useQuery({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path);
      if (!res.ok) throw new Error("Failed to fetch products");
      return api.products.list.responses[200].parse(await res.json());
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: [api.products.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.products.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      return api.products.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: [api.products.search.path, query],
    queryFn: async () => {
      // Assuming the API would accept a query param if fully implemented, 
      // but the manifest search endpoint doesn't define input schema, so using list or specialized logic.
      // For now, implementing as a fetch to the search endpoint.
      const url = `${api.products.search.path}?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to search products");
      return api.products.search.responses[200].parse(await res.json());
    },
    enabled: query.length > 2,
  });
}
