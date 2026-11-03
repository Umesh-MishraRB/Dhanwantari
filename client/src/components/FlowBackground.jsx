import { useEffect, useRef } from "react";

/**
 * Animated backdrop for the landing page: a bundle of luminous fibres entering from the left,
 * converging and fanning out to the right (canvas), over slowly drifting blurred colour blobs (CSS).
 * It is a seamless, endless loop like the reference video, and pauses when the tab is hidden.
 */
export default function FlowBackground() {
  const ref = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const glow = glowRef.current;
    const gctx = glow.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf;
    let W = 0;
    let H = 0;
    const N = 84;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      glow.width = canvas.width;
      glow.height = canvas.height;
      glow.style.width = `${W}px`;
      glow.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      // dark theme: fibres add light ("lighter"); light theme: darker, more saturated strokes drawn normally
      const light = document.documentElement.classList.contains("light");
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      for (let i = 0; i < N; i++) {
        const k = i / (N - 1);
        const s = k - 0.5;
        const ph = t * 0.00035 + i * 0.37;
        const y0 = H * 0.47 + s * H * 0.07 + Math.sin(ph) * 2;
        const c1y = H * 0.47 + s * H * 0.05;
        const c2y = H * 0.52 + s * H * 0.28 + Math.sin(ph * 0.8) * H * 0.014;
        const yEnd = H * 0.62 + s * H * 1.15 + Math.sin(ph * 0.6 + 1) * H * 0.02;
        const hue = 228 + k * 42;
        const alpha = 0.22 + 0.3 * Math.abs(Math.sin(ph * 0.9 + k * 6));
        ctx.beginPath();
        ctx.moveTo(-20, y0);
        ctx.bezierCurveTo(W * 0.38, c1y, W * 0.6, c2y, W * 1.08, yEnd);
        ctx.strokeStyle = light ? `hsla(${hue}, 80%, ${42 + k * 14}%, ${alpha * 0.75})` : `hsla(${hue}, 95%, ${58 + k * 18}%, ${alpha})`;
        ctx.lineWidth = 0.8 + (1 - Math.abs(s) * 2) * 2.2;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      // soft copy of the fibres: blurred with CSS, gives the luminous bloom seen in the reference
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.drawImage(canvas, 0, 0);
    };

    const loop = (t) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduce) draw(0);
    else raf = requestAnimationFrame(loop);

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink-950" aria-hidden="true">
      <div style={{ opacity: "var(--blob-op)" }}>
        <div className="flow-blob c" />
        <div className="flow-blob a" />
        <div className="flow-blob b" />
        <div className="flow-blob d" />
      </div>
      <canvas ref={glowRef} className="absolute inset-0 opacity-90 blur-[16px]" />
      <canvas ref={ref} className="absolute inset-0" />
    </div>
  );
}
