'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FeatureToggleList from '@/components/FeatureToggleList';
import PresetPicker from '@/components/PresetPicker';
import UnitPicker from '@/components/UnitPicker';
import type { FeatureToggles, Preset } from '@/db/schema';
import { useSettings } from '@/hooks/useSettings';
import { PRESET_FEATURES } from '@/lib/features';
import { suggestUnits } from '@/lib/region';
import type { Units } from '@/lib/units';

type Step = 'units' | 'preset' | 'features';

// First-time setup: units, preset and optional fine-tuning of feature toggles.
export default function SetupPage() {
  const { updateSettings } = useSettings();
  const router = useRouter();
  const [step, setStep] = useState<Step>('units');
  const [units, setUnits] = useState<Units>(() =>
    suggestUnits(typeof navigator === 'undefined' ? 'en' : navigator.language),
  );
  const [preset, setPreset] = useState<Exclude<Preset, 'custom'>>('standard');
  const [features, setFeatures] = useState<FeatureToggles>(PRESET_FEATURES.standard);
  const [saving, setSaving] = useState(false);

  async function finish(tuned: boolean) {
    setSaving(true);
    await updateSettings({
      ...units,
      preset: tuned ? 'custom' : preset,
      features: tuned ? features : PRESET_FEATURES[preset],
      setupCompletedAt: new Date(),
    });
    router.replace('/');
  }

  const primary = 'flex-1 rounded-lg bg-sky-600 px-4 py-3 font-semibold text-white disabled:opacity-50';
  const secondary = 'flex-1 rounded-lg border border-gray-400/50 px-4 py-3';

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-gray-500">
          Step {step === 'units' ? 1 : step === 'preset' ? 2 : 3} of 3
        </p>
        <h1 className="text-2xl font-bold">
          {step === 'units' ? 'Units' : step === 'preset' ? 'Preset' : 'Fine-tune features'}
        </h1>
        <p className="text-gray-500">You can change all of this later in Settings.</p>
      </header>

      {step === 'units' && (
        <>
          <UnitPicker units={units} onChange={(change) => setUnits({ ...units, ...change })} />
          <div className="mt-auto flex gap-3">
            <button type="button" className={primary} onClick={() => setStep('preset')}>
              Next
            </button>
          </div>
        </>
      )}

      {step === 'preset' && (
        <>
          <PresetPicker
            value={preset}
            onChange={(chosen) => {
              setPreset(chosen);
              setFeatures(PRESET_FEATURES[chosen]);
            }}
          />
          <div className="mt-auto flex flex-col gap-3">
            <button type="button" className={secondary} onClick={() => setStep('features')}>
              Fine-tune features
            </button>
            <div className="flex gap-3">
              <button type="button" className={secondary} onClick={() => setStep('units')}>
                Back
              </button>
              <button type="button" className={primary} disabled={saving} onClick={() => finish(false)}>
                Finish
              </button>
            </div>
          </div>
        </>
      )}

      {step === 'features' && (
        <>
          <FeatureToggleList features={features} onChange={setFeatures} />
          <div className="mt-auto flex gap-3">
            <button type="button" className={secondary} onClick={() => setStep('preset')}>
              Back
            </button>
            <button type="button" className={primary} disabled={saving} onClick={() => finish(true)}>
              Finish
            </button>
          </div>
        </>
      )}
    </main>
  );
}
