import { useRef, useEffect } from 'react';

interface Props {
  trackPoints: { lat: number; lon: number }[];
  cpMarkers: { name: string; lat: number; lon: number }[];
  width: number;
  height: number;
}

/**
 * Pure-canvas route map for the share card.
 * Renders track polyline + CP markers with no external tile dependencies.
 * Uses Mercator projection with cos(lat) correction for longitude.
 */
export function RouteMapCanvas({ trackPoints, cpMarkers, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trackPoints.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Bounding box
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    for (const pt of trackPoints) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lon < minLon) minLon = pt.lon;
      if (pt.lon > maxLon) maxLon = pt.lon;
    }

    // Longitude shrinks at higher latitudes
    const centerLat = (minLat + maxLat) / 2;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);

    const latRange = maxLat - minLat || 0.001;
    const lonRange = (maxLon - minLon) * cosLat || 0.001;

    // Padding (15% each side)
    const pad = 0.15;
    const padX = width * pad;
    const padY = height * pad;
    const drawW = width - 2 * padX;
    const drawH = height - 2 * padY;

    // Fit to canvas maintaining aspect ratio
    const dataAspect = lonRange / latRange;
    const canvasAspect = drawW / drawH;

    let scaleX: number, scaleY: number, offsetX: number, offsetY: number;
    if (dataAspect > canvasAspect) {
      // Width-constrained
      scaleX = drawW / lonRange;
      scaleY = scaleX;
      offsetX = padX;
      offsetY = padY + (drawH - latRange * scaleY) / 2;
    } else {
      // Height-constrained
      scaleY = drawH / latRange;
      scaleX = scaleY;
      offsetX = padX + (drawW - lonRange * scaleX) / 2;
      offsetY = padY;
    }

    const toX = (lon: number) => offsetX + (lon - minLon) * cosLat * scaleX;
    const toY = (lat: number) => offsetY + (maxLat - lat) * scaleY; // flip Y

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Sample track points for performance (max ~500 points)
    const step = Math.max(1, Math.floor(trackPoints.length / 500));
    const sampled = trackPoints.filter((_, i) => i % step === 0 || i === trackPoints.length - 1);

    // Draw track shadow (subtle depth)
    ctx.beginPath();
    ctx.moveTo(toX(sampled[0].lon), toY(sampled[0].lat));
    for (let i = 1; i < sampled.length; i++) {
      ctx.lineTo(toX(sampled[i].lon), toY(sampled[i].lat));
    }
    ctx.strokeStyle = 'rgba(5, 150, 105, 0.15)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw track line
    ctx.beginPath();
    ctx.moveTo(toX(sampled[0].lon), toY(sampled[0].lat));
    for (let i = 1; i < sampled.length; i++) {
      ctx.lineTo(toX(sampled[i].lon), toY(sampled[i].lat));
    }
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw CP markers
    const cpRadius = 4;
    // Detect start/end overlap (within 12px on canvas)
    const first = cpMarkers[0];
    const last = cpMarkers[cpMarkers.length - 1];
    const startEndOverlap = cpMarkers.length >= 2 && Math.hypot(
      toX(first.lon) - toX(last.lon),
      toY(first.lat) - toY(last.lat),
    ) < 12;

    // Collect placed label bounding boxes for collision avoidance
    const labelBoxes: { x: number; y: number; w: number; h: number }[] = [];
    ctx.font = '600 9px -apple-system, BlinkMacSystemFont, sans-serif';

    for (let i = 0; i < cpMarkers.length; i++) {
      const cp = cpMarkers[i];
      const isStart = i === 0;
      const isEnd = i === cpMarkers.length - 1;

      // If start/end overlap, skip drawing the start marker (end marker wins visually)
      if (startEndOverlap && isStart) continue;

      const cx = toX(cp.lon);
      const cy = toY(cp.lat);

      // Color: start=green, end=red (or bicolor if overlap), middle=amber
      let color: string;
      if (startEndOverlap && isEnd) color = '#ef4444'; // end marker represents both
      else if (isStart) color = '#22c55e';
      else if (isEnd) color = '#ef4444';
      else color = '#f59e0b';

      // White border
      ctx.beginPath();
      ctx.arc(cx, cy, cpRadius + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Colored dot
      ctx.beginPath();
      ctx.arc(cx, cy, cpRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // If start/end overlap, draw a half-green ring on the start side
      if (startEndOverlap && isEnd) {
        ctx.beginPath();
        ctx.arc(cx, cy, cpRadius + 1, -Math.PI / 2, Math.PI / 2); // right half
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label text
      const label = startEndOverlap && isEnd ? `${first.name} / ${cp.name}` : cp.name;
      ctx.font = '600 9px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.textBaseline = 'middle';

      const textWidth = ctx.measureText(label).width;
      const textHeight = 10;

      // Try right, then left, then above, then below
      const placements = [
        { x: cx + cpRadius + 4, y: cy, align: 'left' as const },
        { x: cx - cpRadius - 4 - textWidth, y: cy, align: 'left' as const },
        { x: cx - textWidth / 2, y: cy - cpRadius - 8, align: 'left' as const },
        { x: cx - textWidth / 2, y: cy + cpRadius + 10, align: 'left' as const },
      ];

      let placed = false;
      for (const p of placements) {
        const box = { x: p.x, y: p.y - textHeight / 2, w: textWidth, h: textHeight };
        // Check collision with existing labels
        const collides = labelBoxes.some(b =>
          box.x < b.x + b.w && box.x + box.w > b.x &&
          box.y < b.y + b.h && box.y + box.h > b.y,
        );
        // Check within canvas bounds
        const inBounds = box.x >= 2 && box.x + box.w <= width - 2 && box.y >= 2 && box.y + box.h <= height - 2;
        if (!collides && inBounds) {
          ctx.textAlign = 'left';
          ctx.fillText(label, p.x, p.y);
          labelBoxes.push(box);
          placed = true;
          break;
        }
      }
      // Fallback: place to the right regardless
      if (!placed) {
        ctx.textAlign = 'left';
        ctx.fillText(label, cx + cpRadius + 4, cy);
      }
    }
  }, [trackPoints, cpMarkers, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  );
}
