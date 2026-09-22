import { Redirect, Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import Banner from "../../components/Banner";
import { useAuth } from "../../context/AuthContext";
import { DeliveryProvider, useDeliveries } from "../../context/DeliveryContext";
import { useSocket } from "../../context/SocketContext";
import { useCourierLocationStreaming } from "../../services/location";

function CourierShell({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { hasActiveDelivery, refetch } = useDeliveries();
  const { socket } = useSocket();
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Stream this courier's live position to the backend while any delivery is
  // ASSIGNED/PICKED_UP/IN_TRANSIT, per the contract's geolocation section.
  useCourierLocationStreaming(hasActiveDelivery, token);

  const showBanner = useCallback((message: string) => setBannerMessage(message), []);

  useEffect(() => {
    if (!socket) return;

    const onAssigned = () => {
      showBanner("New delivery assigned to you.");
      refetch();
    };
    const onRouteUpdated = () => {
      showBanner("Your route was updated by dispatch.");
      refetch();
    };

    socket.on("delivery:assigned", onAssigned);
    socket.on("route:updated", onRouteUpdated);
    return () => {
      socket.off("delivery:assigned", onAssigned);
      socket.off("route:updated", onRouteUpdated);
    };
  }, [socket, refetch, showBanner]);

  return (
    <View style={{ flex: 1 }}>
      <Banner message={bannerMessage} onDismiss={() => setBannerMessage(null)} />
      {children}
    </View>
  );
}

export default function CourierLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== "COURIER") {
    return <Redirect href="/login" />;
  }

  return (
    <DeliveryProvider>
      <CourierShell>
        <Stack screenOptions={{ headerShown: true }}>
          <Stack.Screen name="home" options={{ title: "My Deliveries" }} />
          <Stack.Screen name="delivery/[id]/index" options={{ title: "Delivery" }} />
          <Stack.Screen name="delivery/[id]/proof" options={{ title: "Proof of Delivery" }} />
        </Stack>
      </CourierShell>
    </DeliveryProvider>
  );
}
