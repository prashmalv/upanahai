"use client";

import { useEffect, useState } from "react";

/**
 * How far the phone is from being held flat, in degrees.
 *
 * Camera tilt is the single biggest source of error in photo-based foot
 * measurement: a 30 degree tilt makes a naive pixels-per-mm reading wrong by
 * roughly eight shoe sizes. Telling people to "hold the phone level" in a
 * checklist is much weaker than measuring whether they actually did, so this
 * feeds a hard gate on the capture button.
 *
 * DeviceOrientationEvent gives beta (front-back tilt) and gamma (left-right).
 * Held flat, screen up, both are near zero. On iOS 13+ the sensor needs an
 * explicit permission grant, so `needsPermission` is surfaced and the caller
 * can prompt; where the sensor is unavailable (desktop, permission refused) we
 * report `supported: false` and the UI falls back to advising rather than
 * blocking — a guard that can't measure must not lock people out.
 */

export type TiltState = {
  supported: boolean;
  needsPermission: boolean;
  /** Degrees off level, 0 = perfectly flat. null until the first reading. */
  offLevel: number | null;
  beta: number | null;
  gamma: number | null;
  request: () => Promise<void>;
};

/** Beyond this the measurement is not worth taking. */
export const TILT_LIMIT_DEG = 12;

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export function useDeviceTilt(): TiltState {
  const [beta, setBeta] = useState<number | null>(null);
  const [gamma, setGamma] = useState<number | null>(null);
  const [supported, setSupported] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    const ctor = window.DeviceOrientationEvent as OrientationCtor;
    if (typeof ctor.requestPermission === "function") {
      setNeedsPermission(!granted);
    } else {
      setGranted(true);
    }
  }, [granted]);

  useEffect(() => {
    if (typeof window === "undefined" || !granted) return;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null && e.gamma === null) return;
      setSupported(true);
      setBeta(e.beta ?? null);
      setGamma(e.gamma ?? null);
    };
    window.addEventListener("deviceorientation", onOrient);

    // If nothing arrives, the sensor isn't really there (most desktops).
    const timer = setTimeout(() => setSupported((s) => s), 1500);
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      clearTimeout(timer);
    };
  }, [granted]);

  async function request() {
    if (typeof window === "undefined") return;
    const ctor = window.DeviceOrientationEvent as OrientationCtor;
    if (typeof ctor?.requestPermission === "function") {
      try {
        const res = await ctor.requestPermission();
        setGranted(res === "granted");
        setNeedsPermission(res !== "granted");
      } catch {
        setNeedsPermission(false); // can't ask again; fall back to advising
      }
    } else {
      setGranted(true);
    }
  }

  // beta and gamma are independent axes; the worst of the two is what matters.
  const offLevel =
    beta === null && gamma === null
      ? null
      : Math.max(Math.abs(beta ?? 0), Math.abs(gamma ?? 0));

  return { supported, needsPermission, offLevel, beta, gamma, request };
}
