import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { AppDatabase } from './driver';
import { getWorkoutGroup } from './groups';
import { exercises, templateExercises, templates, type Exercise, type TemplateExercise, type TemplateKind } from './schema';
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
