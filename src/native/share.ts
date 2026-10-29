// Opens the phone's share menu with the Share plugin. The interface never calls the plugin directly.
import { Share } from '@capacitor/share';

// Shares a saved file, for example to email, cloud storage or a spreadsheet app.
// A closed share menu is not an error.
export async function shareFile(uri: string, title: string): Promise<void> {
  try {
    await Share.share({ title, files: [uri] });
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return;
    throw error;
  }
}
