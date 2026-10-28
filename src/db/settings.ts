import { and, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { userSettings, users, type UserSettings } from './schema';

export type SettingsChange = Partial<
  Pick<UserSettings, 'weightUnit' | 'distanceUnit' | 'preset' | 'features' | 'setupCompletedAt'>
>;

// Returns the settings of the one local user. Creates the user and the
// settings row on first start. One transaction, so two calls at the same time
// still create only one user.
export async function getLocalSettings(db: AppDatabase): Promise<UserSettings> {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(isNull(users.deletedAt)).limit(1);
    let userId = user?.id;
    if (!userId) {
      userId = crypto.randomUUID();
      await tx.insert(users).values({ id: userId });
    }

    const findSettings = () =>
      tx
        .select()
        .from(userSettings)
        .where(and(eq(userSettings.userId, userId), isNull(userSettings.deletedAt)));
    const [settings] = await findSettings();
    if (settings) {
      return settings;
    }
    await tx.insert(userSettings).values({ userId });
    const [created] = await findSettings();
    return created;
  });
}

export async function updateSettings(
  db: AppDatabase,
  id: string,
  change: SettingsChange,
): Promise<UserSettings> {
  const where = and(eq(userSettings.id, id), isNull(userSettings.deletedAt));
  await db.update(userSettings).set(change).where(where);
  const [settings] = await db.select().from(userSettings).where(where);
  if (!settings) {
    throw new Error(`Settings ${id} not found`);
  }
  return settings;
}
