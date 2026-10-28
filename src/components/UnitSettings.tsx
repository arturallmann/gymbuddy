'use client';

import UnitPicker from '@/components/UnitPicker';
import { useSettings } from '@/hooks/useSettings';

// Unit choice on the settings page. Changing units never changes stored data.
export default function UnitSettings() {
  const { settings, updateSettings } = useSettings();
  return <UnitPicker units={settings} onChange={updateSettings} />;
}
