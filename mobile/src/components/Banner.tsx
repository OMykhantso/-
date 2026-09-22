import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";

interface BannerProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

export default function Banner({ message, onDismiss, durationMs = 4000 }: BannerProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <Text style={styles.banner} numberOfLines={2}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "500",
  },
});
