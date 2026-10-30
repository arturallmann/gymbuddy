import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { getWorkoutGroup } from './groups';
import {
  exercises,
  templateExercises,
  templates,
  workoutExercises,
  workoutGroups,
  workouts,
  type Exercise,
  type TemplateExercise,
  type TemplateKind,
} from './schema';
import { listSets } from './workouts';

// The group key of the one exercise group in a saved superset.
const SUPERSET_GROUP_KEY = '1';

// Saves an exercise group as a saved superset (template kind `superset`, decision 026).
// Each exercise keeps its order, phase and the group's rest. Its targets come from the logged
// sets: the number of sets as target sets, and the values of its last set.
export async function saveGroupAsTemplate(db: AppDatabase, userId: string, groupId: string, name: string): Promise<string> {
  const detail = await getWorkoutGroup(db, groupId);
  if (!detail) {
    throw new Error(`Exercise group ${groupId} not found`);
  }
  const setsPerMember = await Promise.all(detail.members.map((member) => listSets(db, member.id)));
  const templateId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(templates).values({ id: templateId, userId, kind: 'superset', name: name.trim() });
    for (const [index, member] of detail.members.entries()) {
      const memberSets = setsPerMember[index];
      const last = memberSets.at(-1);
      await tx.insert(templateExercises).values({
        templateId,
        exerciseId: member.exerciseId,
        position: index + 1,
        phase: member.phase,
        groupKey: SUPERSET_GROUP_KEY,
        groupType: detail.group.groupType,
        restSeconds: detail.group.restSeconds,
        targetSets: memberSets.length > 0 ? memberSets.length : null,
        targetReps: last?.reps ?? null,
        targetWeightGrams: last?.weightGrams ?? null,
        targetDurationSeconds: last?.durationSeconds ?? null,
        targetDistanceMeters: last?.distanceMeters ?? null,
      });
    }
  });
  return templateId;
}

export type TemplateItem = {
  id: string;
  name: string;
  exercises: (Pick<
    TemplateExercise,
    | 'id'
    | 'exerciseId'
    | 'position'
    | 'phase'
    | 'groupKey'
    | 'groupType'
    | 'restSeconds'
    | 'targetSets'
    | 'targetReps'
    | 'targetWeightGrams'
    | 'targetDurationSeconds'
    | 'targetDistanceMeters'
  > &
    Pick<Exercise, 'name' | 'loadType'>)[];
};

const ofUser = (userId: string, kind: TemplateKind) =>
  and(eq(templates.userId, userId), eq(templates.kind, kind), isNull(templates.deletedAt));

// The user's templates of one kind, newest first, with their exercises in order.
export async function listTemplates(db: AppDatabase, userId: string, kind: TemplateKind): Promise<TemplateItem[]> {
  const rows = await db
    .select({ id: templates.id, name: templates.name })
    .from(templates)
    .where(ofUser(userId, kind))
    .orderBy(desc(templates.createdAt));
  if (rows.length === 0) return [];
  const items = await db
    .select({
      templateId: templateExercises.templateId,
      id: templateExercises.id,
      exerciseId: templateExercises.exerciseId,
      position: templateExercises.position,
      phase: templateExercises.phase,
      groupKey: templateExercises.groupKey,
      groupType: templateExercises.groupType,
      restSeconds: templateExercises.restSeconds,
      targetSets: templateExercises.targetSets,
      targetReps: templateExercises.targetReps,
      targetWeightGrams: templateExercises.targetWeightGrams,
      targetDurationSeconds: templateExercises.targetDurationSeconds,
      targetDistanceMeters: templateExercises.targetDistanceMeters,
      name: exercises.name,
      loadType: exercises.loadType,
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(exercises.id, templateExercises.exerciseId))
    .where(and(inArray(templateExercises.templateId, rows.map((row) => row.id)), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position));
  return rows.map((row) => ({
    ...row,
    exercises: items
      .filter((item) => item.templateId === row.id)
      .map((item) => {
        const { templateId, ...rest } = item;
        void templateId;
        return rest;
      }),
  }));
}

export async function renameTemplate(db: AppDatabase, userId: string, id: string, name: string) {
  await db
    .update(templates)
    .set({ name: name.trim() })
    .where(and(eq(templates.id, id), eq(templates.userId, userId), isNull(templates.deletedAt)));
}

// Deletes the template and its exercises. Workouts that used it keep their copies (decision 011).
export async function deleteTemplate(db: AppDatabase, userId: string, id: string, deletedAt: Date = new Date()) {
  await db.transaction(async (tx) => {
    const [own] = await tx
      .select({ id: templates.id })
      .from(templates)
      .where(and(eq(templates.id, id), eq(templates.userId, userId), isNull(templates.deletedAt)));
    if (!own) return;
    await tx
      .update(templateExercises)
      .set({ deletedAt })
      .where(and(eq(templateExercises.templateId, id), isNull(templateExercises.deletedAt)));
    await tx.update(templates).set({ deletedAt }).where(eq(templates.id, id));
  });
}

// Copies a template into a workout, after its last workout exercise (decision 011): new workout
// exercises with the template's phases, and a new exercise group per group key that records the
// template it came from. The workout never reads template rows for its structure afterwards,
// so later template changes never change the workout. One transaction.
export async function addTemplateToWorkout(db: AppDatabase, workoutId: string, templateId: string): Promise<string[]> {
  const ids: string[] = [];
  await db.transaction(async (tx) => {
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
  });
  return ids;
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
