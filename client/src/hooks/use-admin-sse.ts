/**
 * useAdminSSE — connects to /api/admin/events SSE channel.
 * Calls invalidateQueries on new orders / status updates so React Query
 * automatically refreshes without manual reloads.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useAdminSSE() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    function connect() {
      const es = new EventSource("/api/admin/events", { withCredentials: true });
      esRef.current = es;

      es.addEventListener("new_order", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      });

      es.addEventListener("order_update", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      });

      es.onerror = () => {
        es.close();
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
    };
  }, [queryClient]);
}
