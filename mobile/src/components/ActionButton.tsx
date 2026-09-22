import React from "react";
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleSheet, Text } from "react-native";

type Variant = "primary" | "danger" | "secondary" | "outline";

interface ActionButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: "#2563EB", text: "#FFFFFF" },
  danger: { bg: "#DC2626", text: "#FFFFFF" },
  secondary: { bg: "#111827", text: "#FFFFFF" },
  outline: { bg: "transparent", text: "#2563EB", border: "#2563EB" },
};

export default function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: ActionButtonProps) {
  const colors = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border ?? colors.bg,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
