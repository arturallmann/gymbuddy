// The Android Back button and gesture, through the App plugin (4b.2). The interface never calls
// the plugin directly. In the browser there is no Back button to catch, so nothing happens.
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Calls `listener` on every Back press instead of the default (closing the app).
// Returns a function that stops listening.
export function onBackButton(listener: () => void): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }
  const handle = App.addListener('backButton', listener);
  return () => {
    void handle.then((registered) => registered.remove());
  };
}

// Closes the app, as Back does on the home page.
export function exitApp(): void {
  if (Capacitor.isNativePlatform()) {
    void App.exitApp();
  }
}
