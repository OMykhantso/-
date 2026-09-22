import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusHistoryEntry } from "../api/types";
import { STATUS_COLORS, STATUS_LABELS } from "./statusStyle";

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
}

export default function StatusTimeline({ history }: StatusTimelineProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <View>
      {sorted.map((entry, index) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.markerColumn}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[entry.status] }]} />
            {index < sorted.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.content}>
            <Text style={styles.status}>{STATUS_LABELS[entry.status]}</Text>
            <Text style={styles.time}>{new Date(entry.createdAt).toLocaleString("uk-UA")}</Text>
            {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  markerColumn: {
    width: 20,
    alignItems: "center",
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: "#E2E8F0",
    marginVertical: 2,
  },
  content: {
    flex: 1,
    paddingBottom: 18,
    marginLeft: 12,
  },
  status: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  time: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  note: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
});
