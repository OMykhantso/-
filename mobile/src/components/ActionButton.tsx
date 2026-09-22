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

const VARIANT_STYLES: Record<
  Variant,
  { bg: string; text: string; border?: string; pressedBg: string }
> = {
  primary: { bg: "#2563EB", pressedBg: "#1D4ED8", text: "#FFFFFF" },
  danger: { bg: "#EF4444", pressedBg: "#DC2626", text: "#FFFFFF" },
  secondary: { bg: "#0F172A", pressedBg: "#1E293B", text: "#FFFFFF" },
  outline: { bg: "transparent", pressedBg: "#EFF6FF", text: "#2563EB", border: "#2563EB" },
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
          backgroundColor: pressed && !isDisabled ? colors.pressedBg : colors.bg,
          borderColor: colors.border ?? colors.bg,
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
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
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
