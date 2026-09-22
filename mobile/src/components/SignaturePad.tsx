import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { GestureResponderEvent, PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import ViewShot, { captureRef, ViewShotRef } from "react-native-view-shot";

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  /** Returns a base64-encoded PNG of the current signature (no data: URI prefix). */
  capture: () => Promise<string>;
}

interface SignaturePadProps {
  height?: number;
}

const STROKE_COLOR = "#111827";

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(({ height = 180 }, ref) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [liveDraw, setLiveDraw] = useState<string>("");
  const currentPathRef = useRef<string>("");
  const viewShotRef = useRef<ViewShotRef>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPathRef.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setLiveDraw(currentPathRef.current);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPathRef.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setLiveDraw(currentPathRef.current);
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current) {
          setPaths((prev) => [...prev, currentPathRef.current]);
        }
        currentPathRef.current = "";
        setLiveDraw("");
      },
    })
  ).current;

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        setPaths([]);
        currentPathRef.current = "";
        setLiveDraw("");
      },
      isEmpty: () => paths.length === 0,
      capture: async () => {
        if (!viewShotRef.current) throw new Error("Поле для підпису ще не готове.");
        return captureRef(viewShotRef, { result: "base64", format: "png", quality: 1 });
      },
    }),
    [paths]
  );

  const isEmpty = paths.length === 0 && liveDraw === "";

  return (
    <View style={styles.wrapper}>
      <ViewShot ref={viewShotRef} style={[styles.canvas, { height }]} options={{ format: "png" }}>
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          <Svg style={StyleSheet.absoluteFill}>
            {paths.map((d, index) => (
              <Path
                key={index}
                d={d}
                stroke={STROKE_COLOR}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {liveDraw ? (
              <Path
                d={liveDraw}
                stroke={STROKE_COLOR}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>
        {isEmpty ? (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>Поставте підпис тут</Text>
          </View>
        ) : null}
      </ViewShot>
    </View>
  );
});

SignaturePad.displayName = "SignaturePad";

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  canvas: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  hint: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default SignaturePad;
