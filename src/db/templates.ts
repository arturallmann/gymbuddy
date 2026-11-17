// Queries for templates: saving saved supersets and routines, and listing, renaming and deleting them.
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { AppDatabase, Transaction } from './driver';
import { getWorkoutGroup } from './groups';
import {
  exercises,
  templateExercises,
  templates,
  workoutGroups,
  type Exercise,
  type TemplateExercise,
  type TemplateKind,
} from './schema';
import { listSets } from './sets';
import { listWorkoutExercises } from './workoutExercises';

// The group key of the one exercise group in a saved superset.
const SUPERSET_GROUP_KEY = '1';


type Source = {
  exerciseId: string;
  phase: TemplateExercise['phase'];
  groupKey: string | null;
  groupType: TemplateExercise['groupType'];
  restSeconds: number | null;
  sets: { reps: number | null; weightGrams: number | null; durationSeconds: number | null; distanceMeters: number | null }[];
};

// Writes the template rows: order, phase, group, and targets from the logged sets
// (the number of sets, and the values of the last set).
async function insertTemplateRows(tx: Transaction, templateId: string, sources: Source[]) {
  for (const [index, source] of sources.entries()) {
    const last = source.sets.at(-1);
    await tx.insert(templateExercises).values({
      templateId,
      exerciseId: source.exerciseId,
      position: index + 1,
      phase: source.phase,
      groupKey: source.groupKey,
      groupType: source.groupType,
      restSeconds: source.restSeconds,
      targetSets: source.sets.length > 0 ? source.sets.length : null,
      targetReps: last?.reps ?? null,
      targetWeightGrams: last?.weightGrams ?? null,
      targetDurationSeconds: last?.durationSeconds ?? null,
      targetDistanceMeters: last?.distanceMeters ?? null,
    });
  }
}

// The rows a saved superset gets from an exercise group: each exercise with its order, phase and the
// group's type and rest, and targets from its logged sets.
async function supersetSources(db: AppDatabase, groupId: string): Promise<Source[]> {
  const detail = await getWorkoutGroup(db, groupId);
  if (!detail) {
    throw new Error(`Exercise group ${groupId} not found`);
  }
  const setsPerMember = await Promise.all(detail.members.map((member) => listSets(db, member.id)));
  return detail.members.map((member, index) => ({
    exerciseId: member.exerciseId,
    phase: member.phase,
    groupKey: SUPERSET_GROUP_KEY,
    groupType: detail.group.groupType,
    restSeconds: detail.group.restSeconds,
    sets: setsPerMember[index],
  }));
}

// Saves an exercise group as a saved superset (template kind `superset`, decision 026).
// Each exercise keeps its order, phase and the group's rest. Its targets come from the logged
// sets: the number of sets as target sets, and the values of its last set.
export async function saveGroupAsTemplate(db: AppDatabase, userId: string, groupId: string, name: string): Promise<string> {
  const sources = await supersetSources(db, groupId);
  const templateId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(templates).values({ id: templateId, userId, kind: 'superset', name: name.trim() });
    await insertTemplateRows(tx, templateId, sources);
  });
  return templateId;
}

export type SavedSupersetMatch = { id: string; name: string };

// The saved superset that "Save superset" changes instead of saving a new one (5.2.2, decision 051):
// the one the exercise group was added from, otherwise the newest one with the same exercises in the
// same order. Null when there is none, or the group does not exist.
export async function findSavedSuperset(db: AppDatabase, userId: string, groupId: string): Promise<SavedSupersetMatch | null> {
  const detail = await getWorkoutGroup(db, groupId);
  if (!detail) return null;
  const saved = await db
    .select({ id: templates.id, name: templates.name })
    .from(templates)
    .where(and(eq(templates.userId, userId), eq(templates.kind, 'superset'), isNull(templates.deletedAt)))
    .orderBy(desc(templates.updatedAt), desc(templates.createdAt));
  const origin = saved.find((template) => template.id === detail.group.templateId);
  if (origin) return origin;
  if (saved.length === 0) return null;
  const rows = await db
    .select({ templateId: templateExercises.templateId, exerciseId: templateExercises.exerciseId })
    .from(templateExercises)
    .where(and(inArray(templateExercises.templateId, saved.map((template) => template.id)), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position));
  const exercisesOf = (templateId: string) => rows.filter((row) => row.templateId === templateId).map((row) => row.exerciseId);
  const wanted = detail.members.map((member) => member.exerciseId).join(',');
  return saved.find((template) => exercisesOf(template.id).join(',') === wanted) ?? null;
}

// Changes a saved superset to match an exercise group (5.2.2): its exercises, order, rest and targets
// come from the group, its name stays. The old rows get deletedAt. One transaction.
export async function updateSavedSuperset(
  db: AppDatabase,
  userId: string,
  templateId: string,
  groupId: string,
  updatedAt: Date = new Date(),
): Promise<void> {
  const sources = await supersetSources(db, groupId);
  await db.transaction(async (tx) => {
    const [template] = await tx
      .select({ id: templates.id })
      .from(templates)
      .where(and(eq(templates.id, templateId), eq(templates.userId, userId), eq(templates.kind, 'superset'), isNull(templates.deletedAt)));
    if (!template) {
      throw new Error(`Saved superset ${templateId} not found`);
    }
    await tx
      .update(templateExercises)
      .set({ deletedAt: updatedAt, updatedAt })
      .where(and(eq(templateExercises.templateId, templateId), isNull(templateExercises.deletedAt)));
    await insertTemplateRows(tx, templateId, sources);
    await tx.update(templates).set({ updatedAt }).where(eq(templates.id, templateId));
  });
}

// Saves a whole workout as a routine (template kind `routine`, decision 027): every workout
// exercise in order with its phase, each exercise group with its own group key, type and rest,
// and targets from the logged sets.
export async function saveWorkoutAsRoutine(db: AppDatabase, userId: string, workoutId: string, name: string): Promise<string> {
  const items = await listWorkoutExercises(db, workoutId);
  const groupIds = [...new Set(items.flatMap((item) => (item.groupId ? [item.groupId] : [])))];
  const groups = groupIds.length
    ? await db.select().from(workoutGroups).where(inArray(workoutGroups.id, groupIds))
    : [];
  const setsPerItem = await Promise.all(items.map((item) => listSets(db, item.id)));
  const templateId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(templates).values({ id: templateId, userId, kind: 'routine', name: name.trim() });
    await insertTemplateRows(
      tx,
      templateId,
      items.map((item, index) => {
        const group = groups.find((row) => row.id === item.groupId);
        return {
          exerciseId: item.exerciseId,
          phase: item.phase,
          groupKey: group ? String(groupIds.indexOf(group.id) + 1) : null,
          groupType: group?.groupType ?? null,
          restSeconds: group?.restSeconds ?? null,
          sets: setsPerItem[index],
        };
      }),
    );
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
