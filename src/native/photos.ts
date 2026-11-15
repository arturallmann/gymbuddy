// Photos for custom exercises (decision 039): taken with the camera or chosen from the phone's
// photos through the Camera plugin. In the browser a file input does both. Every photo is made
// smaller (at most 1080 px on its long side) and saved as JPEG, so it stays around 150–300 KB.
// The interface never calls the plugin directly.
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { blobToBase64 } from './storedImages';

export type PhotoSource = 'camera' | 'photos';

const MAX_SIDE = 1080;
const JPEG_QUALITY = 0.8;

// The size of a photo whose long side is at most `max`, keeping its shape.
export function fitInside(width: number, height: number, max: number = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// A smaller JPEG copy of an image, as base64.
async function toSmallJpeg(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const size = fitInside(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('The photo could not be made smaller'))), 'image/jpeg', JPEG_QUALITY),
  );
  return blobToBase64(jpeg);
}

// A file chosen in the browser, or null when the user closed the picker.
function chooseFileInBrowser(source: PhotoSource): Promise<Blob | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

const isCancel = (error: unknown) => error instanceof Error && /cancel/i.test(error.message);

// A new photo as base64 JPEG, or null when the user cancelled.
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  let blob: Blob | null;
  if (Capacitor.isNativePlatform()) {
    try {
      const result =
        source === 'camera'
          ? await Camera.takePhoto({ quality: 90, correctOrientation: true })
          : (await Camera.chooseFromGallery({ allowMultipleSelection: false })).results[0];
      if (!result?.webPath) return null;
      blob = await (await fetch(result.webPath)).blob();
    } catch (error) {
      if (isCancel(error)) return null;
      throw error;
    }
  } else {
    blob = await chooseFileInBrowser(source);
  }
  return blob ? toSmallJpeg(blob) : null;
}
