// Images in the app's own storage (decisions 038 and 039), through the Filesystem plugin.
// The interface never calls the plugin directly.
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

// Writes an image (base64) to the app's data folder, creating folders as needed.
export async function writeStoredImage(file: string, base64: string): Promise<void> {
  await Filesystem.writeFile({ path: file, data: base64, directory: Directory.Data, recursive: true });
}

// An address an <img> can show. On the phone it points to the file; in the browser, where the
// plugin keeps files in IndexedDB, it is a data address with the file's content.
export async function storedImageSrc(file: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.getUri({ path: file, directory: Directory.Data });
    return Capacitor.convertFileSrc(uri);
  }
  const { data } = await Filesystem.readFile({ path: file, directory: Directory.Data });
  return typeof data === 'string' ? `data:image/jpeg;base64,${data}` : URL.createObjectURL(data);
}

// The content of a Blob as base64, as the plugin writes binary files.
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error ?? new Error('The image could not be read'));
    reader.readAsDataURL(blob);
  });
}
