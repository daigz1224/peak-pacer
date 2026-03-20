export interface PhoneSizePreset {
  label: string;
  width: number;        // base px (× 3 = native)
  height: number;
  safeAreaTop: number;  // top inset for notch / Dynamic Island / punch-hole (base px)
  group: 'iPhone' | 'Android';
}

export const PHONE_PRESETS: PhoneSizePreset[] = [
  // ── iPhone ──
  // Dynamic Island: ~59px safe area; notch: ~47px; SE: ~20px (status bar only)
  { label: 'iPhone 17 Pro Max',          width: 440, height: 956,  safeAreaTop: 62, group: 'iPhone' },
  { label: 'iPhone 17 / 17 Pro',         width: 402, height: 874,  safeAreaTop: 59, group: 'iPhone' },
  { label: 'iPhone 16/15 Pro Max',       width: 430, height: 932,  safeAreaTop: 59, group: 'iPhone' },
  { label: 'iPhone 16/15/14 Pro',        width: 393, height: 852,  safeAreaTop: 59, group: 'iPhone' },
  { label: 'iPhone 14/13/12',            width: 390, height: 844,  safeAreaTop: 47, group: 'iPhone' },
  { label: 'iPhone SE',                  width: 375, height: 667,  safeAreaTop: 20, group: 'iPhone' },

  // ── Android ──
  // Punch-hole cameras: typically ~32-36px safe area
  { label: '三星 S Ultra / 小米 Ultra (2K)', width: 480, height: 1067, safeAreaTop: 36, group: 'Android' },
  { label: 'Pixel 9/8 Pro',                width: 448, height: 997,  safeAreaTop: 36, group: 'Android' },
  { label: '华为 / 小米旗舰',               width: 420, height: 907,  safeAreaTop: 34, group: 'Android' },
  { label: 'Pixel 9/8 / 三星 S 系列',       width: 412, height: 915,  safeAreaTop: 34, group: 'Android' },
  { label: 'Android 标准 (1080×2400)',      width: 360, height: 800,  safeAreaTop: 32, group: 'Android' },
];

export const DEFAULT_PHONE_INDEX = 1; // iPhone 17 / 17 Pro
