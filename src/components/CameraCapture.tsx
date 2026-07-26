"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, RefreshCw } from "lucide-react";

/**
 * Reusable capture widget: live camera OR file upload -> returns a JPEG dataURL.
 * Used by Foot Scan, Find-by-Photo and Try-On.
 */
export function CameraCapture({
  onCapture,
  label = "Capture",
  aspect = "aspect-video"
}: {
  onCapture: (dataUrl: string) => void;
  label?: string;
  aspect?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        <video ref={videoRef} className={`h-full w-full object-cover ${streaming ? "" : "hidden"}`} playsInline muted />
        {!streaming && (
          <div className="grid h-full w-full place-items-center text-slate-400">
            <Camera size={40} />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && <p className="text-sm text-amber-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!streaming ? (
          <button onClick={startCamera} className="btn-primary"><Camera size={16} /> Open camera</button>
        ) : (
          <>
            <button onClick={snap} className="btn-accent"><Camera size={16} /> {label}</button>
            <button onClick={stopCamera} className="btn-ghost"><RefreshCw size={16} /> Stop</button>
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
