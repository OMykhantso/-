import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as deliveriesApi from "../api/deliveries";
import * as routesApi from "../api/routes";
import { ACTIVE_DELIVERY_STATUSES, CourierRoute, Delivery } from "../api/types";
import { useAuth } from "./AuthContext";

interface DeliveryContextValue {
  deliveries: Delivery[];
  route: CourierRoute | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasActiveDelivery: boolean;
}

const DeliveryContext = createContext<DeliveryContextValue | undefined>(undefined);

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [route, setRoute] = useState<CourierRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!token || !user) return;
    setError(null);
    try {
      const [deliveryList, activeRoute] = await Promise.all([
        deliveriesApi.listMyDeliveries(token),
        routesApi.getActiveRoute(token, user.id),
      ]);
      setDeliveries(deliveryList);
      setRoute(activeRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your deliveries.");
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
  }, [refetch]);

  const hasActiveDelivery = useMemo(
    () => deliveries.some((d) => ACTIVE_DELIVERY_STATUSES.includes(d.status)),
    [deliveries]
  );

  const value = useMemo(
    () => ({ deliveries, route, isLoading, error, refetch, hasActiveDelivery }),
    [deliveries, route, isLoading, error, refetch, hasActiveDelivery]
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDeliveries(): DeliveryContextValue {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error("useDeliveries must be used within a DeliveryProvider");
  return ctx;
}
