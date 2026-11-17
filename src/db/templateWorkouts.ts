// Templates in workouts: copying a template into a workout, starting a workout from a routine,
// and the targets a workout exercise got from its template.
import { and, asc, eq, isNull, max } from 'drizzle-orm';
import type { AppDatabase, Transaction } from './driver';
import { templateExercises, workoutExercises, workoutGroups, workouts, type TemplateExercise } from './schema';

// Copies a template into a workout, after its last workout exercise (decision 011): new workout
// exercises with the template's phases, and a new exercise group per group key that records the
// template it came from. The workout never reads template rows for its structure afterwards,
// so later template changes never change the workout. One transaction.
export async function addTemplateToWorkout(db: AppDatabase, workoutId: string, templateId: string): Promise<string[]> {
  let ids: string[] = [];
  await db.transaction(async (tx) => {
    ids = await copyTemplate(tx, workoutId, templateId);
  });
  return ids;
}

async function copyTemplate(tx: Transaction, workoutId: string, templateId: string): Promise<string[]> {
  const ids: string[] = [];
  const rows = await tx
    .select()
    .from(templateExercises)
    .where(and(eq(templateExercises.templateId, templateId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position));
  const [{ last }] = await tx
    .select({ last: max(workoutExercises.position).as('last') })
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)));
  const groups = new Map<string, string>();
  for (const [index, row] of rows.entries()) {
    let groupId: string | null = null;
    if (row.groupKey) {
      groupId = groups.get(row.groupKey) ?? null;
      if (!groupId) {
        groupId = crypto.randomUUID();
        groups.set(row.groupKey, groupId);
        await tx.insert(workoutGroups).values({
          id: groupId,
          workoutId,
          groupType: row.groupType ?? 'superset',
          restSeconds: row.restSeconds,
          templateId,
        });
      }
    }
    const id = crypto.randomUUID();
    await tx.insert(workoutExercises).values({
      id,
      workoutId,
      exerciseId: row.exerciseId,
      position: (last ?? 0) + index + 1,
      phase: row.phase,
      groupId,
    });
    ids.push(id);
  }
  return ids;
}

// Starts a workout from a routine: the new active workout records the routine, and gets a copy
// of its exercises and groups. One transaction. Refuses while another workout is active (decision 019).
export async function startWorkoutFromRoutine(
  db: AppDatabase,
  userId: string,
  templateId: string,
  startedAt: Date = new Date(),
): Promise<string> {
  const workoutId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    const [active] = await tx
      .select({ id: workouts.id })
      .from(workouts)
      .where(and(eq(workouts.userId, userId), isNull(workouts.endedAt), isNull(workouts.deletedAt)));
    if (active) {
      throw new Error('A workout is active already');
    }
    await tx.insert(workouts).values({ id: workoutId, userId, startedAt, templateId });
    await copyTemplate(tx, workoutId, templateId);
  });
  return workoutId;
}

export type Targets = Pick<
  TemplateExercise,
  'targetSets' | 'targetReps' | 'targetWeightGrams' | 'targetDurationSeconds' | 'targetDistanceMeters'
>;

// The template targets for a workout exercise, or null. The template is the one its exercise group
// or its workout (a routine) came from. Only the set form's prefill reads them (DATA_MODEL).
export async function getTemplateTargets(db: AppDatabase, workoutExerciseId: string): Promise<Targets | null> {
  const [row] = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      groupTemplateId: workoutGroups.templateId,
      workoutTemplateId: workouts.templateId,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .leftJoin(workoutGroups, eq(workoutGroups.id, workoutExercises.groupId))
    .where(eq(workoutExercises.id, workoutExerciseId));
  const templateId = row?.groupTemplateId ?? row?.workoutTemplateId;
  if (!row || !templateId) return null;
  const [targets] = await db
    .select({
      targetSets: templateExercises.targetSets,
      targetReps: templateExercises.targetReps,
      targetWeightGrams: templateExercises.targetWeightGrams,
      targetDurationSeconds: templateExercises.targetDurationSeconds,
      targetDistanceMeters: templateExercises.targetDistanceMeters,
    })
    .from(templateExercises)
    .where(
      and(
        eq(templateExercises.templateId, templateId),
        eq(templateExercises.exerciseId, row.exerciseId),
        isNull(templateExercises.deletedAt),
      ),
    )
    .orderBy(asc(templateExercises.position))
    .limit(1);
  return targets ?? null;
}
