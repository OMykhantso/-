import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import ActionButton from "../components/ActionButton";
import StatusTimeline from "../components/StatusTimeline";
import { STATUS_COLORS, STATUS_LABELS } from "../components/statusStyle";
import * as deliveriesApi from "../api/deliveries";
import { DeliveryDetail, StatusAction } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useDeliveries } from "../context/DeliveryContext";
import { useSocket } from "../context/SocketContext";
import { getCurrentCoords } from "../services/location";

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { refetch: refetchList } = useDeliveries();
  const { socket } = useSocket();

  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<StatusAction | null>(null);
  const [showFailReason, setShowFailReason] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [courierCoords, setCourierCoords] = useState<{ lat: number; lng: number } | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setError(null);
    try {
      const detail = await deliveriesApi.getDelivery(token, id);
      setDelivery(detail);
    } catch (err) {
      setError(err instanceof Error ? `Помилка: ${err.message}` : "Не вдалося завантажити доставку.");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    getCurrentCoords().then(setCourierCoords);
  }, []);

  useEffect(() => {
    if (!socket || !id) return;
    const handler = (payload: { deliveryId: string }) => {
      if (payload.deliveryId === id) load();
    };
    socket.on("delivery:statusChanged", handler);
    return () => {
      socket.off("delivery:statusChanged", handler);
    };
  }, [socket, id, load]);

  const currentAssignment = delivery?.assignments[0];

  const runAction = useCallback(
    async (action: StatusAction, note?: string) => {
      if (!token || !id) return;
      setActionInFlight(action);
      try {
        const coords = await getCurrentCoords();
        await deliveriesApi.updateDeliveryStatus(token, id, {
          action,
          lat: coords?.lat,
          lng: coords?.lng,
          note,
        });
        await Promise.all([load(), refetchList()]);
      } catch (err) {
        Alert.alert("Дію не виконано", err instanceof Error ? err.message : "Спробуйте ще раз.");
      } finally {
        setActionInFlight(null);
      }
    },
    [token, id, load, refetchList]
  );

  const region: Region | undefined = useMemo(() => {
    if (!delivery) return undefined;
    const points = [
      { lat: delivery.pickupAddress.lat, lng: delivery.pickupAddress.lng },
      { lat: delivery.dropoffAddress.lat, lng: delivery.dropoffAddress.lng },
      ...(courierCoords ? [courierCoords] : []),
    ];
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.6),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.6),
    };
  }, [delivery, courierCoords]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !delivery) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Доставку не знайдено."}</Text>
      </View>
    );
  }

  const isBusy = actionInFlight !== null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[delivery.status] }]}>
        <Text style={styles.statusPillText}>{STATUS_LABELS[delivery.status]}</Text>
      </View>

      {region ? (
        <MapView style={styles.map} initialRegion={region} region={region}>
          <Marker
            coordinate={{ latitude: delivery.pickupAddress.lat, longitude: delivery.pickupAddress.lng }}
            title="Звідки"
            description={delivery.pickupAddress.street}
            pinColor="#2563EB"
          />
          <Marker
            coordinate={{ latitude: delivery.dropoffAddress.lat, longitude: delivery.dropoffAddress.lng }}
            title="Куди"
            description={delivery.dropoffAddress.street}
            pinColor="#EF4444"
          />
          {courierCoords ? (
            <Marker
              coordinate={{ latitude: courierCoords.lat, longitude: courierCoords.lng }}
              title="Ви"
              pinColor="#10B981"
            />
          ) : null}
        </MapView>
      ) : null}

      <Section title="Звідки">
        <Text style={styles.address}>{delivery.pickupAddress.label}</Text>
        <Text style={styles.addressDetail}>
          {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
        </Text>
      </Section>

      <Section title="Куди">
        <Text style={styles.address}>{delivery.dropoffAddress.label}</Text>
        <Text style={styles.addressDetail}>
          {delivery.dropoffAddress.street}, {delivery.dropoffAddress.city}
        </Text>
      </Section>

      {delivery.description ? (
        <Section title="Посилка">
          <Text style={styles.addressDetail}>{delivery.description}</Text>
          {delivery.weightKg ? <Text style={styles.addressDetail}>{delivery.weightKg} кг</Text> : null}
        </Section>
      ) : null}

      <Section title="Клієнт">
        <Text style={styles.addressDetail}>{delivery.client.name}</Text>
        {delivery.client.phone ? <Text style={styles.addressDetail}>{delivery.client.phone}</Text> : null}
      </Section>

      <View style={styles.actions}>
        {delivery.status === "ASSIGNED" && currentAssignment?.status === "ASSIGNED" ? (
          <>
            <ActionButton
              label="Accept Delivery"
              onPress={() => runAction("accept")}
              loading={actionInFlight === "accept"}
              disabled={isBusy}
            />
            <View style={styles.spacer} />
            <ActionButton
              label="Reject"
              variant="danger"
              onPress={() =>
                Alert.alert("Reject delivery?", "This will send it back for reassignment.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Reject", style: "destructive", onPress: () => runAction("reject") },
                ])
              }
              loading={actionInFlight === "reject"}
              disabled={isBusy}
            />
          </>
        ) : null}

        {delivery.status === "ASSIGNED" && currentAssignment?.status === "ACCEPTED" ? (
          <ActionButton
            label="Mark Picked Up"
            onPress={() => runAction("pickup")}
            loading={actionInFlight === "pickup"}
            disabled={isBusy}
          />
        ) : null}

        {delivery.status === "PICKED_UP" ? (
          <ActionButton
            label="Start Transit"
            onPress={() => runAction("start_transit")}
            loading={actionInFlight === "start_transit"}
            disabled={isBusy}
          />
        ) : null}

        {delivery.status === "IN_TRANSIT" ? (
          <>
            <ActionButton
              label="Deliver"
              onPress={() => router.push(`/delivery/${delivery.id}/proof`)}
              disabled={isBusy}
            />
            <View style={styles.spacer} />
            {showFailReason ? (
              <View style={styles.failBox}>
                <TextInput
                  style={styles.failInput}
                  placeholder="Reason the delivery failed..."
                  value={failReason}
                  onChangeText={setFailReason}
                  multiline
                />
                <View style={styles.failButtons}>
                  <View style={styles.failButtonHalf}>
                    <ActionButton
                      label="Cancel"
                      variant="outline"
                      onPress={() => {
                        setShowFailReason(false);
                        setFailReason("");
                      }}
                    />
                  </View>
                  <View style={styles.failButtonHalf}>
                    <ActionButton
                      label="Confirm Failed"
                      variant="danger"
                      loading={actionInFlight === "fail"}
                      disabled={!failReason.trim() || isBusy}
                      onPress={() => runAction("fail", failReason.trim())}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <ActionButton
                label="Report Failed"
                variant="danger"
                onPress={() => setShowFailReason(true)}
                disabled={isBusy}
              />
            )}
          </>
        ) : null}

        {delivery.status === "CREATED" && currentAssignment?.status === "REJECTED" ? (
          <Text style={styles.infoText}>You rejected this delivery. It's waiting for reassignment.</Text>
        ) : null}
        {["DELIVERED", "FAILED", "CANCELLED"].includes(delivery.status) ? (
          <Text style={styles.infoText}>This delivery is complete. No further action needed.</Text>
        ) : null}
      </View>

      <Section title="History">
        <StatusTimeline history={delivery.statusHistory} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" },
  error: { color: "#DC2626", fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  statusPillText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  map: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  address: { fontSize: 15, fontWeight: "600", color: "#111827" },
  addressDetail: { fontSize: 14, color: "#4B5563", marginTop: 2 },
  actions: { marginVertical: 8 },
  spacer: { height: 10 },
  infoText: { color: "#6B7280", fontSize: 13, textAlign: "center", paddingVertical: 8 },
  failBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  failInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  failButtons: { flexDirection: "row", gap: 10 },
  failButtonHalf: { flex: 1 },
});
