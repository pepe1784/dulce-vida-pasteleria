import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomerProfile } from "@shared/models/auth";

async function fetchCustomer(): Promise<CustomerProfile | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });
  if (response.status === 401) return null;
  if (!response.ok) return null;
  return response.json();
}

async function updateProfile(data: {
  phone?: string;
  preferredAddress?: object | null;
  name?: string;
}): Promise<CustomerProfile> {
  const res = await fetch("/api/auth/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error" }));
    throw new Error(err.message);
  }
  return res.json();
}

async function logoutCustomer(): Promise<void> {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  window.location.href = "/";
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery<CustomerProfile | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchCustomer,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/auth/user"], updated);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutCustomer,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  /** Parsed preferredAddress (JSON → object) */
  const preferredAddress: Record<string, string> | null = (() => {
    if (!customer?.preferredAddress) return null;
    try {
      return JSON.parse(customer.preferredAddress);
    } catch {
      return null;
    }
  })();

  return {
    customer,
    isLoading,
    isAuthenticated: !!customer,
    preferredAddress,
    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    // URL to start Google sign-in
    loginUrl: "/api/auth/google",
  };
}
