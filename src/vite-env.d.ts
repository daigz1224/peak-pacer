/// <reference types="vite/client" />

declare module 'virtual:gpx-files' {
  const files: string[];
  export default files;
}

interface Umami {
  track(event: string, data?: Record<string, string | number>): void;
}

declare const umami: Umami | undefined;
