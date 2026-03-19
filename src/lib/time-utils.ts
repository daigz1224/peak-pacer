/**
 * Convert elapsed minutes from a start time into a clock time string.
 *
 * @param startTime  Race start time in "HH:MM" format (e.g. "06:00")
 * @param elapsedMinutes  Minutes elapsed since start
 * @returns Clock time string, e.g. "09:45" or "次日 02:30" if past midnight
 */
export function formatClockTime(startTime: string, elapsedMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + Math.round(elapsedMinutes);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remaining = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(remaining / 60);
  const mm = remaining % 60;
  const time = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  if (days >= 2) return `D${days + 1} ${time}`;
  if (days === 1) return `次日 ${time}`;
  return time;
}
