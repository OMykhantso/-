import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Delivery } from "../api/types";
import { STATUS_COLORS, STATUS_LABELS } from "./statusStyle";

interface DeliveryCardProps {
  delivery: Delivery;
  onPress: () => void;
  sequenceLabel?: string;
  etaAt?: string | null;
}

export default function DeliveryCard({ delivery, onPress, sequenceLabel, etaAt }: DeliveryCardProps) {
  const eta = etaAt ?? delivery.etaAt;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.headerRow}>
        {sequenceLabel ? (
          <View style={styles.sequenceBadge}>
            <Text style={styles.sequenceText}>{sequenceLabel}</Text>
          </View>
        ) : null}
        <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[delivery.status] }]}>
          <Text style={styles.statusPillText}>{STATUS_LABELS[delivery.status]}</Text>
        </View>
      </View>

      <View style={styles.addressBlock}>
        <Text style={styles.addressLabel}>Pickup</Text>
        <Text style={styles.addressText} numberOfLines={1}>
          {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
        </Text>
      </View>
      <View style={styles.addressBlock}>
        <Text style={styles.addressLabel}>Dropoff</Text>
        <Text style={styles.addressText} numberOfLines={1}>
          {delivery.dropoffAddress.street}, {delivery.dropoffAddress.city}
        </Text>
      </View>

      {delivery.description ? (
        <Text style={styles.description} numberOfLines={1}>
          {delivery.description}
        </Text>
      ) : null}

      {eta ? (
        <Text style={styles.eta}>ETA {new Date(eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardPressed: {
    backgroundColor: "#F3F4F6",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sequenceBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  sequenceText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: "auto",
  },
  statusPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  addressBlock: {
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 14,
    color: "#111827",
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },
  eta: {
    marginTop: 6,
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
});
