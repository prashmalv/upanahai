"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, RefreshCw, AlertTriangle } from "lucide-react";
import { useDeviceTilt, TILT_LIMIT_DEG } from "@/lib/useDeviceTilt";
import { LevelIndicator } from "./LevelIndicator";

/**
 * Reusable capture widget: live camera OR file upload -> returns a JPEG dataURL.
 * Used by Foot Scan, Find-by-Photo and Try-On.
 *
 * With `requireLevel`, the shutter is blocked while the phone is tilted beyond
 * TILT_LIMIT_DEG and a live spirit level is drawn over the preview. Foot
 * measurement is the only caller that needs this: tilt is the dominant error
 * source there (~8 shoe sizes at 30 degrees), whereas identifying a shoe from a
 * photo doesn't care about the angle.
 *
 * The gate only applies when the sensor actually reports — on desktop, or if
 * orientation permission is refused, capture stays enabled. A guard that cannot
 * measure must not lock people out of the feature.
 */
export function CameraCapture({
  onCapture,
  label = "Capture",
  aspect = "aspect-video",
  requireLevel = false
}: {
  onCapture: (dataUrl: string) => void;
  label?: string;
  aspect?: string;
  requireLevel?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tilt = useDeviceTilt();

  const tiltKnown = requireLevel && tilt.supported && tilt.offLevel !== null;
  const tooTilted = tiltKnown && (tilt.offLevel as number) > TILT_LIMIT_DEG;

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
      // Ask for the orientation sensor at the same moment as the camera, while
      // the tap that granted it is still the user's active gesture (iOS needs one).
      if (requireLevel && tilt.needsPermission) void tilt.request();
    } catch {
      setError("Camera not available. You can upload a photo instead.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  }

  useEffect(() => () => stopCamera(), []);

  function snap() {
    if (tooTilted) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    onCapture(dataUrl);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCapture(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <div className={`relative ${aspect} w-full overflow-hidden rounded-2xl bg-slate-900`}>
        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${streaming ? "" : "hidden"}`}
          playsInline
          muted
        />
        {!streaming && (
          <div className="grid h-full w-full place-items-center text-slate-400">
            <Camera size={40} />
          </div>
        )}
        {requireLevel && streaming && <LevelIndicator tilt={tilt} />}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && <p className="text-sm text-amber-600">{error}</p>}

      {requireLevel && streaming && !tilt.supported && !tilt.needsPermission && (
        <p className="flex items-start gap-1.5 text-xs text-slate-500">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          This device doesn&apos;t report its tilt, so we can&apos;t check the angle for
          you — line the camera up square above your foot.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!streaming ? (
          <button onClick={startCamera} className="btn-primary">
            <Camera size={16} /> Open camera
          </button>
        ) : (
          <>
            <button
              onClick={snap}
              disabled={tooTilted}
              title={tooTilted ? "Hold the phone flat first" : undefined}
              className={tooTilted ? "btn-ghost cursor-not-allowed opacity-60" : "btn-accent"}
            >
              <Camera size={16} />{" "}
              {tooTilted ? `Hold flat (${Math.round(tilt.offLevel as number)}° off)` : label}
            </button>
            <button onClick={stopCamera} className="btn-ghost">
              <RefreshCw size={16} /> Stop
            </button>
          </>
        )}
        <label className="btn-ghost cursor-pointer">
          <Upload size={16} /> Upload photo
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
      </div>
    </div>
  );
}
