'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { exerciseImageUrl } from '@/lib/exercises';
import { storedImageSrc } from '@/native/storedImages';

type Props = {
  path: string;
  // A file in the app's storage that replaces the bundled image (decisions 038 and 039).
  storedFile: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

// One exercise image: the copy bundled with the app, or a file in the app's storage, such as a
// downloaded library image or a photo of a custom exercise.
export default function ExerciseImage({ path, storedFile, alt, width, height, className }: Props) {
  const [stored, setStored] = useState<{ file: string; src: string } | null>(null);

  useEffect(() => {
    if (!storedFile) return;
    let current = true;
    storedImageSrc(storedFile)
      .then((src) => current && setStored({ file: storedFile, src }))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [storedFile]);

  const src = storedFile ? (stored?.file === storedFile ? stored.src : null) : exerciseImageUrl(path);
  if (!src) {
    return <span aria-hidden className={`block bg-line ${className ?? ''}`} style={{ width, height }} />;
  }
  // Unoptimized: the app is a static export, and stored images are file or data addresses.
  return <Image src={src} alt={alt} width={width} height={height} className={className} unoptimized />;
}
