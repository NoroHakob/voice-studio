"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { createNoise3D } from "simplex-noise";

const emptySubscribe = () => () => {};

const detectSafari = () =>
  navigator.userAgent.includes("Safari") &&
  !navigator.userAgent.includes("Chrome");

type WavyBackgroundProps = {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
  waveYOffset?: number;
} & React.ComponentProps<"div">;

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
  waveYOffset = 250,
  ...props
}: WavyBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Latest options, read inside the animation loop without re-running it.
  const optionsRef = useRef({
    colors,
    waveWidth,
    backgroundFill,
    blur,
    speed,
    waveOpacity,
    waveYOffset,
  });

  useEffect(() => {
    optionsRef.current = {
      colors,
      waveWidth,
      backgroundFill,
      blur,
      speed,
      waveOpacity,
      waveYOffset,
    };
  });

  const isSafari = useSyncExternalStore(
    emptySubscribe,
    detectSafari,
    () => false
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise = createNoise3D();
    let animationId = 0;
    let nt = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.filter = `blur(${optionsRef.current.blur}px)`;
    };

    const drawWave = (n: number) => {
      const o = optionsRef.current;
      const waveColors = o.colors ?? [
        "#38bdf8",
        "#818cf8",
        "#c084fc",
        "#e879f9",
        "#22d3ee",
      ];

      nt += o.speed === "fast" ? 0.002 : 0.001;

      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth = o.waveWidth || 50;
        ctx.strokeStyle = waveColors[i % waveColors.length];
        for (let x = 0; x < canvas.width; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt) * 100;
          ctx.lineTo(x, y + (o.waveYOffset ?? 250));
        }
        ctx.stroke();
        ctx.closePath();
      }
    };

    const render = () => {
      const o = optionsRef.current;
      ctx.fillStyle = o.backgroundFill || "black";
      ctx.globalAlpha = o.waveOpacity ?? 0.5;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawWave(5);
      animationId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className={cn(
        "h-screen flex flex-col items-center justify-center",
        containerClassName
      )}
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={isSafari ? { filter: `blur(${blur}px)` } : undefined}
      />
      <div className={cn("relative z-10", className)} {...props}>
        {children}
      </div>
    </div>
  );
};