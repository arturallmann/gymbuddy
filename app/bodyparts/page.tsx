'use client';

import BodyPartsList from '@/components/BodyPartsList';
import { useEffect, useState } from 'react';

export default function BodyParts() {
  return (
    <div className="top-0 left-0 w-screen h-screen">
      <div className="bg-sky-950 flex top-0 left-0 h-20 w-screen">
        <p className="w-screen flex place-content-center">select body part:</p>
      </div>
      <div className="top-20 left-0">
        <BodyPartsList />
      </div>
    </div>
  );
}
