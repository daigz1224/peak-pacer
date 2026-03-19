import { useRef, useEffect } from 'react';

interface Props {
  data: { distance: number; elevation: number }[];
  width: number;
  height: number;
  theme?: 'dark' | 'light';
  cpMarkers?: { distance: number; name: string }[];
}

export function ElevationSilhouette({ data, width, height, theme = 'dark', cpMarkers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const minEle = Math.min(...data.map((d) => d.elevation));
    const maxEle = Math.max(...data.map((d) => d.elevation));
    const maxDist = data[data.length - 1].distance;
    const eleRange = maxEle - minEle || 1;
    const pad = height * 0.1;

    const toX = (dist: number) => (dist / maxDist) * width;
    const toY = (ele: number) => height - pad - ((ele - minEle) / eleRange) * (height - 2 * pad);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (theme === 'light') {
      grad.addColorStop(0, 'rgba(5, 150, 105, 0.5)');
      grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
    } else {
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
      grad.addColorStop(0.5, 'rgba(5, 150, 105, 0.4)');
      grad.addColorStop(1, 'rgba(6, 95, 70, 0.1)');
    }

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (const pt of data) {
      ctx.lineTo(toX(pt.distance), toY(pt.elevation));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw stroke
    ctx.beginPath();
    ctx.moveTo(toX(data[0].distance), toY(data[0].elevation));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(toX(data[i].distance), toY(data[i].elevation));
    }
    ctx.strokeStyle = theme === 'light' ? 'rgba(5, 150, 105, 0.7)' : 'rgba(16, 185, 129, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw CP markers
    if (cpMarkers && cpMarkers.length > 0) {
      const markerColor = theme === 'light' ? 'rgba(100,116,139,0.4)' : 'rgba(148,163,184,0.3)';
      const dotColor = theme === 'light' ? 'rgba(100,116,139,0.6)' : 'rgba(251,191,36,0.7)';
      for (const cp of cpMarkers) {
        const x = toX(cp.distance);
        // Find closest elevation for this distance
        let elY = height * 0.5;
        for (let j = 0; j < data.length - 1; j++) {
          if (data[j].distance <= cp.distance && data[j + 1].distance >= cp.distance) {
            const t = (cp.distance - data[j].distance) / (data[j + 1].distance - data[j].distance || 1);
            const ele = data[j].elevation + t * (data[j + 1].elevation - data[j].elevation);
            elY = toY(ele);
            break;
          }
        }
        // Dashed vertical line from bottom to profile
        ctx.save();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x, elY);
        ctx.stroke();
        ctx.restore();
        // Small dot on the profile line
        ctx.beginPath();
        ctx.arc(x, elY, 2, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }
    }
  }, [data, width, height, cpMarkers]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  );
}
