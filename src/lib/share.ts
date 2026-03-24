import html2canvas from 'html2canvas-pro';

/** Capture a DOM element as a PNG blob (with timeout for iOS safety) */
export async function captureShareCard(element: HTMLElement): Promise<Blob> {
  const TIMEOUT_MS = 15_000;

  // Detect iOS accessibility text-scaling: compare actual rendered size
  // to the CSS-specified size.  If inflated >10 %, lower the capture
  // scale so the canvas stays within Safari's memory budget (~4-5 MP).
  const cssW = parseFloat(element.style.width) || 402;
  const cssH = parseFloat(element.style.height) || 874;
  const rect = element.getBoundingClientRect();
  const inflation = Math.max(rect.width / cssW, rect.height / cssH);
  const scale = inflation > 1.1 ? 2 : 3;

  const capture = async (): Promise<Blob> => {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      backgroundColor: null,
      width: cssW,
      height: cssH,
    });
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/png',
      );
    });
  };

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('壁纸生成超时，请稍后重试')), TIMEOUT_MS),
  );

  return Promise.race([capture(), timeout]);
}

/** Trigger download of a blob as a file */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Share via Web Share API (mobile) or fall back to download */
export async function shareImage(blob: Blob, raceName: string): Promise<void> {
  const filename = `${raceName.replace(/[^a-zA-Z0-9\u4e00-\u9fff-]/g, '_')}.png`;

  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    const file = new File([blob], filename, { type: 'image/png' });
    const shareData = { files: [file] };
    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed, fall through to download
      }
    }
  }

  downloadImage(blob, filename);
}

export interface ShareParams {
  file: string; // built-in GPX filename
  itra: number;
}

/** Encode share params into URL hash */
export function encodeShareUrl(params: ShareParams): string {
  const json = JSON.stringify(params);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`;
}

/** Decode share params from URL hash */
export function decodeShareUrl(hash: string): ShareParams | null {
  const match = hash.match(/^#share=(.+)$/);
  if (!match) return null;
  try {
    const json = decodeURIComponent(escape(atob(match[1])));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
