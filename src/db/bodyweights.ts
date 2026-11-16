import { and, asc, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { bodyweights, type Bodyweight } from './schema';

// The user's bodyweights, oldest first (decision 043).
export async function listBodyweights(db: AppDatabase, userId: string): Promise<Bodyweight[]> {
  return db
    .select()
    .from(bodyweights)
    .where(and(eq(bodyweights.userId, userId), isNull(bodyweights.deletedAt)))
    .orderBy(asc(bodyweights.measuredAt), asc(bodyweights.createdAt));
}

// Writes a new bodyweight. Older bodyweights stay, so earlier workouts keep the bodyweight they had.
export async function addBodyweight(
  db: AppDatabase,
  userId: string,
  weightGrams: number,
  measuredAt: Date = new Date(),
): Promise<Bodyweight> {
  const id = crypto.randomUUID();
  await db.insert(bodyweights).values({ id, userId, weightGrams, measuredAt });
  const [row] = await db.select().from(bodyweights).where(eq(bodyweights.id, id));
  return row;
}

// Deletes a bodyweight entered by mistake. Workouts of its day then use the bodyweight before it.
export async function deleteBodyweight(db: AppDatabase, id: string, deletedAt: Date = new Date()) {
  await db.update(bodyweights).set({ deletedAt }).where(and(eq(bodyweights.id, id), isNull(bodyweights.deletedAt)));
}
