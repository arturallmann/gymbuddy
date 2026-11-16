import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { exercises, workoutExercises, workoutGroups, type WorkoutGroup } from './schema';
import type { WorkoutExerciseItem } from './workouts';
import { gatherIds } from '@/lib/blocks';

// Rest after a round of a new superset, until the user changes it.
export const DEFAULT_REST_SECONDS = 90;

// Makes a superset of two or more workout exercises of one workout and one phase that are
// not in a group yet (decision 025). They move next to each other, where the first one is.
// One transaction, so a failure leaves the workout as it was.
export async function makeSuperset(
  db: AppDatabase,
  workoutId: string,
  workoutExerciseIds: string[],
  restSeconds: number = DEFAULT_REST_SECONDS,
): Promise<string> {
  const groupId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    const list = await tx
      .select({ id: workoutExercises.id, groupId: workoutExercises.groupId, phase: workoutExercises.phase })
      .from(workoutExercises)
      .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)))
      .orderBy(asc(workoutExercises.position));
    const chosen = list.filter((item) => workoutExerciseIds.includes(item.id));
    if (chosen.length < 2 || chosen.length !== new Set(workoutExerciseIds).size) {
      throw new Error('A superset needs two or more workout exercises of this workout');
    }
    if (chosen.some((item) => item.groupId)) {
      throw new Error('A workout exercise is in a group already');
    }
    if (new Set(chosen.map((item) => item.phase)).size > 1) {
      throw new Error('The workout exercises of a superset must be in one phase');
    }
    await tx.insert(workoutGroups).values({ id: groupId, workoutId, groupType: 'superset', restSeconds });
    for (const [index, id] of gatherIds(list, workoutExerciseIds).entries()) {
      await tx
        .update(workoutExercises)
        .set({ position: index + 1, ...(workoutExerciseIds.includes(id) ? { groupId } : {}) })
        .where(eq(workoutExercises.id, id));
    }
  });
  return groupId;
}

// Takes the workout exercises out of the group. They keep their sets and their order.
export async function ungroupWorkoutExercises(db: AppDatabase, groupId: string, deletedAt: Date = new Date()) {
  await db.transaction(async (tx) => {
    await tx.update(workoutExercises).set({ groupId: null }).where(eq(workoutExercises.groupId, groupId));
    await tx
      .update(workoutGroups)
      .set({ deletedAt })
      .where(and(eq(workoutGroups.id, groupId), isNull(workoutGroups.deletedAt)));
  });
}

export async function changeGroupRest(db: AppDatabase, groupId: string, restSeconds: number) {
  await db
    .update(workoutGroups)
    .set({ restSeconds })
    .where(and(eq(workoutGroups.id, groupId), isNull(workoutGroups.deletedAt)));
}

export type GroupDetail = { group: WorkoutGroup; members: WorkoutExerciseItem[] };

// One exercise group with its members in order, or null when it does not exist or was deleted.
export async function getWorkoutGroup(db: AppDatabase, groupId: string): Promise<GroupDetail | null> {
  const [group] = await db
    .select()
    .from(workoutGroups)
    .where(and(eq(workoutGroups.id, groupId), isNull(workoutGroups.deletedAt)));
  if (!group) {
    return null;
  }
  const members = await db
    .select({
      id: workoutExercises.id,
      exerciseId: workoutExercises.exerciseId,
      name: exercises.name,
      position: workoutExercises.position,
      phase: workoutExercises.phase,
      groupId: workoutExercises.groupId,
      loadType: exercises.loadType,
      tracksReps: exercises.tracksReps,
      tracksDuration: exercises.tracksDuration,
      tracksDistance: exercises.tracksDistance,
      category: exercises.category,
      defaultDurationSeconds: exercises.defaultDurationSeconds,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(and(eq(workoutExercises.groupId, groupId), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.position));
  return { group, members };
}

// The rest of each group of a workout, keyed by group id.
export async function listGroupRests(db: AppDatabase, groupIds: string[]): Promise<Map<string, number | null>> {
  if (groupIds.length === 0) return new Map();
  const rows = await db
    .select({ id: workoutGroups.id, restSeconds: workoutGroups.restSeconds })
    .from(workoutGroups)
    .where(and(inArray(workoutGroups.id, groupIds), isNull(workoutGroups.deletedAt)));
  return new Map(rows.map((row) => [row.id, row.restSeconds]));
}
