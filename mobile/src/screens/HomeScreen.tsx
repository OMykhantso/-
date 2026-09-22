import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import ActionButton from "../components/ActionButton";
import DeliveryCard from "../components/DeliveryCard";
import { useAuth } from "../context/AuthContext";
import { useDeliveries } from "../context/DeliveryContext";
import { ACTIVE_DELIVERY_STATUSES, Delivery, RouteStop } from "../api/types";

function findRelevantStop(stops: RouteStop[], delivery: Delivery): RouteStop | undefined {
  const wantsDropoff = delivery.status === "PICKED_UP" || delivery.status === "IN_TRANSIT";
  const wantedKind = wantsDropoff ? "DROPOFF" : "PICKUP";
  const forDelivery = stops.filter((s) => s.deliveryId === delivery.id);
  return forDelivery.find((s) => s.kind === wantedKind) ?? forDelivery[0];
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { deliveries, route, isLoading, error, refetch } = useDeliveries();
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const { active, completed, other } = useMemo(() => {
    const activeList = deliveries.filter((d) => ACTIVE_DELIVERY_STATUSES.includes(d.status));
    const completedList = deliveries.filter((d) => d.status === "DELIVERED");
    const otherList = deliveries.filter(
      (d) => !ACTIVE_DELIVERY_STATUSES.includes(d.status) && d.status !== "DELIVERED"
    );

    if (route) {
      activeList.sort((a, b) => {
        const stopA = findRelevantStop(route.stops, a);
        const stopB = findRelevantStop(route.stops, b);
        if (stopA && stopB) return stopA.sequence - stopB.sequence;
        if (stopA) return -1;
        if (stopB) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } else {
      activeList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return { active: activeList, completed: completedList, other: otherList };
  }, [deliveries, route]);

  if (isLoading && deliveries.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Привіт, {user?.name?.split(" ")[0] ?? "Кур'єр"}</Text>
          <Text style={styles.subGreeting}>
            {route ? `Маршрут з ${route.stops.length} зупинками` : "Оптимізованого маршруту ще немає"}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>Помилка: {error}</Text> : null}

      <Text style={styles.sectionTitle}>Активні ({active.length})</Text>
      {active.length === 0 ? (
        <Text style={styles.empty}>Наразі активних доставок немає.</Text>
      ) : (
        active.map((delivery) => {
          const stop = route ? findRelevantStop(route.stops, delivery) : undefined;
          return (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              sequenceLabel={stop ? String(stop.sequence + 1) : undefined}
              etaAt={stop?.etaAt}
              onPress={() => router.push(`/delivery/${delivery.id}`)}
            />
          );
        })
      )}

      {other.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Потребує уваги ({other.length})</Text>
          {other.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onPress={() => router.push(`/delivery/${delivery.id}`)}
            />
          ))}
        </>
      ) : null}

      {completed.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Завершені ({completed.length})</Text>
          {completed.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onPress={() => router.push(`/delivery/${delivery.id}`)}
            />
          ))}
        </>
      ) : null}

      <View style={styles.logoutWrapper}>
        <ActionButton label="Вийти" variant="outline" onPress={() => logout()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 24, fontWeight: "800", color: "#0F172A", letterSpacing: 0.2 },
  subGreeting: { fontSize: 13, color: "#64748B", marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 24,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  empty: { color: "#94A3B8", fontSize: 13, marginBottom: 8 },
  error: { color: "#EF4444", fontSize: 13, marginBottom: 12 },
  logoutWrapper: { marginTop: 32 },
});
