// Tells the user that a timer is done: a vibration through the Haptics plugin and a short tone.
// The interface never calls the plugin directly. A failed signal never breaks the timer.
import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';

const VIBRATION_MS = 600;
const TONE_HZ = 880;
const TONE_SECONDS = 0.4;

export async function vibrate(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.vibrate({ duration: VIBRATION_MS });
    } else {
      navigator.vibrate?.(VIBRATION_MS);
    }
  } catch (error) {
    console.error(error);
  }
}

// A short beep through the Web Audio API, so the app needs no sound file.
export function playTone(): void {
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = TONE_HZ;
    gain.gain.setValueAtTime(0.3, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + TONE_SECONDS);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + TONE_SECONDS);
    oscillator.onended = () => void context.close();
  } catch (error) {
    console.error(error);
  }
}

export async function signalTimerDone(): Promise<void> {
  playTone();
  await vibrate();
}
