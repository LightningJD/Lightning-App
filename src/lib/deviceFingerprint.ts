/**
 * Simple browser device fingerprint generator
 * Uses canvas rendering + navigator properties → djb2 hash
 * No external library needed
 */

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function generateDeviceFingerprint(): string {
  const parts: string[] = [];

  // Navigator properties
  parts.push(navigator.userAgent);
  parts.push(navigator.language);
  parts.push(String(navigator.hardwareConcurrency || 0));
  parts.push(String(screen.width) + 'x' + String(screen.height));
  parts.push(String(screen.colorDepth));
  parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Lightning⚡fp', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Lightning⚡fp', 4, 17);
      parts.push(canvas.toDataURL());
    }
  } catch {
    parts.push('canvas-unavailable');
  }

  return djb2Hash(parts.join('|||'));
}
