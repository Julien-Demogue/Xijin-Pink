import type { RefObject } from "react";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
}

export function CameraView({ videoRef, canvasRef }: CameraViewProps) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
