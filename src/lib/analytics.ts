/** Safe wrapper — no-op if umami script hasn't loaded or is blocked */
export function track(event: string, data?: Record<string, string | number>) {
  try {
    umami?.track(event, data);
  } catch { /* blocked by ad-blocker or not loaded */ }
}
