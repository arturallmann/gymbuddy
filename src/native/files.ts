// Saves a file with the Filesystem plugin. The interface never calls the plugin directly.
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

// Base64 for binary files such as .xlsx; the plugin writes binary data as base64.
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// On the phone: writes the file to the app's cache folder and returns its address for
// sharing. In the browser: downloads the file and returns null.
export async function saveFile(name: string, data: string | Uint8Array, mimeType: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([typeof data === 'string' ? data : new Uint8Array(data)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return null;
  }
  const result =
    typeof data === 'string'
      ? await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 })
      : await Filesystem.writeFile({ path: name, data: toBase64(data), directory: Directory.Cache });
  return result.uri;
}
