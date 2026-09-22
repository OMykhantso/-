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
        <Text style={styles.addressLabel}>Звідки</Text>
        <Text style={styles.addressText} numberOfLines={1}>
          {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
        </Text>
      </View>
      <View style={styles.addressBlock}>
        <Text style={styles.addressLabel}>Куди</Text>
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
        <Text style={styles.eta}>
          Орієнтовний час прибуття:{" "}
          {new Date(eta).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: "#F8FAFC",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sequenceBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sequenceText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
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
    marginBottom: 6,
  },
  addressLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 14,
    color: "#0F172A",
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
  },
  eta: {
    marginTop: 8,
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
});
