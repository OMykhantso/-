import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { postCourierLocation } from "../api/courier";

const PING_INTERVAL_MS = 12_000;

export interface Coords {
  lat: number;
  lng: number;
}

export async function requestForegroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

/** One-off read of the device's current position, or null if unavailable/denied. */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const granted = await requestForegroundLocationPermission();
    if (!granted) return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * While `enabled` is true and a token is available, polls the device's
 * location every ~12s and reports it to the backend via POST /courier/location.
 * Foreground-only, per the mobile app's scope.
 */
export function useCourierLocationStreaming(enabled: boolean, token: string | null): void {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || !token) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const granted = await requestForegroundLocationPermission();
        if (!granted || cancelled) return;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const speedMetersPerSecond = position.coords.speed;
        const speedKmh =
          speedMetersPerSecond != null && speedMetersPerSecond >= 0
            ? Math.round(speedMetersPerSecond * 3.6 * 10) / 10
            : undefined;
        await postCourierLocation(token, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speedKmh,
        });
      } catch {
        // Best-effort background ping; swallow errors so one bad reading
        // (e.g. a transient GPS timeout) doesn't stop future ticks.
      }
    };

    tick();
    const interval = setInterval(tick, PING_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, token]);
}
