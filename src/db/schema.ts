import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// Shared columns for every table: UUID, timestamps and soft delete (decision 007).
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  deletedAt: integer('deletedAt', { mode: 'timestamp_ms' }),
};

export const WEIGHT_UNITS = ['kg', 'lb'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const DISTANCE_UNITS = ['metric', 'imperial'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const PRESETS = ['simple', 'standard', 'advanced', 'custom'] as const;
export type Preset = (typeof PRESETS)[number];

export const CATEGORIES = ['strength', 'cardio', 'stretch', 'mobility'] as const;
export type Category = (typeof CATEGORIES)[number];

export const LOAD_TYPES = ['external', 'bodyweight', 'none'] as const;
export type LoadType = (typeof LOAD_TYPES)[number];

export const MUSCLE_GROUP_ROLES = ['primary', 'secondary'] as const;
export type MuscleGroupRole = (typeof MUSCLE_GROUP_ROLES)[number];

export const TEMPLATE_KINDS = ['superset', 'routine'] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const GROUP_TYPES = ['superset', 'circuit', 'giant_set'] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const PHASES = ['warmup', 'main', 'cooldown'] as const;
export type Phase = (typeof PHASES)[number];

export const SET_TYPES = ['normal', 'warmup', 'dropset', 'failure'] as const;
export type SetType = (typeof SET_TYPES)[number];

export const EXERCISE_SOURCES = ['free-exercise-db', 'custom'] as const;
export type ExerciseSource = (typeof EXERCISE_SOURCES)[number];

// Feature toggles hide interface only. See docs/DATA_MODEL.md.
export type FeatureToggles = {
  restTimer: boolean;
  supersets: boolean;
  templates: boolean;
  rpe: boolean;
  setTypes: boolean;
  phases: boolean;
  setNotes: boolean;
  exerciseImages: boolean;
  charts: boolean;
};

// Same as the standard preset.
export const DEFAULT_FEATURES: FeatureToggles = {
  restTimer: true,
  supersets: true,
  templates: true,
  rpe: false,
  setTypes: false,
  phases: false,
  setNotes: true,
  exerciseImages: true,
  charts: true,
};

export const users = sqliteTable('users', {
  id: id(),
  ...timestamps,
});

export const userSettings = sqliteTable('user_settings', {
  id: id(),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => users.id),
  weightUnit: text('weightUnit', { enum: WEIGHT_UNITS }).notNull().default('kg'),
  distanceUnit: text('distanceUnit', { enum: DISTANCE_UNITS }).notNull().default('metric'),
  preset: text('preset', { enum: PRESETS }).notNull().default('standard'),
  // Only the toggles that differ from DEFAULT_FEATURES need to be stored.
  features: text('features', { mode: 'json' })
    .$type<Partial<FeatureToggles>>()
    .notNull()
    .default(sql`'{}'`),
  setupCompletedAt: integer('setupCompletedAt', { mode: 'timestamp_ms' }),
  ...timestamps,
});

export const muscleGroups = sqliteTable('muscle_groups', {
  id: id(),
  // Stable name from the exercise library, such as "lower back".
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  ...timestamps,
});

export const exercises = sqliteTable(
  'exercises',
  {
    id: id(),
    // NULL for library exercises, set for custom exercises.
    userId: text('userId').references(() => users.id),
    source: text('source', { enum: EXERCISE_SOURCES }).notNull(),
    sourceId: text('sourceId'),
    name: text('name').notNull(),
    description: text('description'),
    instructions: text('instructions'),
    category: text('category', { enum: CATEGORIES }).notNull(),
    equipment: text('equipment'),
    loadType: text('loadType', { enum: LOAD_TYPES }).notNull(),
    tracksReps: integer('tracksReps', { mode: 'boolean' }).notNull().default(false),
    tracksDuration: integer('tracksDuration', { mode: 'boolean' }).notNull().default(false),
    tracksDistance: integer('tracksDistance', { mode: 'boolean' }).notNull().default(false),
    defaultDurationSeconds: integer('defaultDurationSeconds'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('exercises_source_sourceId_idx').on(t.source, t.sourceId),
    index('exercises_name_idx').on(t.name),
  ],
);

export const exerciseMuscleGroups = sqliteTable(
  'exercise_muscle_groups',
  {
    id: id(),
    exerciseId: text('exerciseId')
      .notNull()
      .references(() => exercises.id),
    muscleGroupId: text('muscleGroupId')
      .notNull()
      .references(() => muscleGroups.id),
    role: text('role', { enum: MUSCLE_GROUP_ROLES }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('exercise_muscle_groups_exercise_muscle_idx').on(t.exerciseId, t.muscleGroupId),
    index('exercise_muscle_groups_muscle_idx').on(t.muscleGroupId),
  ],
);

export const exerciseImages = sqliteTable(
  'exercise_images',
  {
    id: id(),
    exerciseId: text('exerciseId')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    // Path relative to the exercise image folder, such as "3_4_Sit-Up/0.jpg".
    path: text('path').notNull(),
    license: text('license'),
    attribution: text('attribution'),
    ...timestamps,
  },
  (t) => [uniqueIndex('exercise_images_exercise_position_idx').on(t.exerciseId, t.position)],
);

export const exercisePreferences = sqliteTable(
  'exercise_preferences',
  {
    id: id(),
    userId: text('userId')
      .notNull()
      .references(() => users.id),
    exerciseId: text('exerciseId')
      .notNull()
      .references(() => exercises.id),
    notes: text('notes'),
    // Unit override. NULL = use user_settings.
    weightUnit: text('weightUnit', { enum: WEIGHT_UNITS }),
    distanceUnit: text('distanceUnit', { enum: DISTANCE_UNITS }),
    ...timestamps,
  },
  (t) => [uniqueIndex('exercise_preferences_user_exercise_idx').on(t.userId, t.exerciseId)],
);

export const templates = sqliteTable('templates', {
  id: id(),
  userId: text('userId')
    .notNull()
    .references(() => users.id),
  kind: text('kind', { enum: TEMPLATE_KINDS }).notNull(),
  name: text('name').notNull(),
  notes: text('notes'),
  ...timestamps,
});

export const templateExercises = sqliteTable(
  'template_exercises',
  {
    id: id(),
    templateId: text('templateId')
      .notNull()
      .references(() => templates.id),
    exerciseId: text('exerciseId')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    phase: text('phase', { enum: PHASES }).notNull().default('main'),
    // Rows with the same groupKey become one exercise group in the workout.
    groupKey: text('groupKey'),
    groupType: text('groupType', { enum: GROUP_TYPES }),
    restSeconds: integer('restSeconds'),
    targetSets: integer('targetSets'),
    targetReps: integer('targetReps'),
    targetWeightGrams: integer('targetWeightGrams'),
    targetDurationSeconds: integer('targetDurationSeconds'),
    targetDistanceMeters: integer('targetDistanceMeters'),
    ...timestamps,
  },
  (t) => [index('template_exercises_template_idx').on(t.templateId, t.position)],
);

export const workouts = sqliteTable(
  'workouts',
  {
    id: id(),
    userId: text('userId')
      .notNull()
      .references(() => users.id),
    startedAt: integer('startedAt', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('endedAt', { mode: 'timestamp_ms' }),
    notes: text('notes'),
    // The routine this workout started from, if any.
    templateId: text('templateId').references(() => templates.id),
    ...timestamps,
  },
  (t) => [index('workouts_user_started_idx').on(t.userId, t.startedAt)],
);

export const workoutGroups = sqliteTable(
  'workout_groups',
  {
    id: id(),
    workoutId: text('workoutId')
      .notNull()
      .references(() => workouts.id),
    groupType: text('groupType', { enum: GROUP_TYPES }).notNull(),
    restSeconds: integer('restSeconds'),
    // Records where the group came from. The workout never reads template rows.
    templateId: text('templateId').references(() => templates.id),
    ...timestamps,
  },
  (t) => [index('workout_groups_workout_idx').on(t.workoutId)],
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: id(),
    workoutId: text('workoutId')
      .notNull()
      .references(() => workouts.id),
    exerciseId: text('exerciseId')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    phase: text('phase', { enum: PHASES }).notNull().default('main'),
    groupId: text('groupId').references(() => workoutGroups.id),
    restSeconds: integer('restSeconds'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    index('workout_exercises_workout_idx').on(t.workoutId, t.position),
    index('workout_exercises_exercise_idx').on(t.exerciseId),
  ],
);

export const sets = sqliteTable(
  'sets',
  {
    id: id(),
    workoutExerciseId: text('workoutExerciseId')
      .notNull()
      .references(() => workoutExercises.id),
    // Set number. Inside an exercise group this is the round number.
    position: integer('position').notNull(),
    setType: text('setType', { enum: SET_TYPES }).notNull().default('normal'),
    // On a bodyweight exercise this is the added weight. See docs/DATA_MODEL.md.
    weightGrams: integer('weightGrams'),
    reps: integer('reps'),
    durationSeconds: integer('durationSeconds'),
    distanceMeters: integer('distanceMeters'),
    rpe: real('rpe'),
    restSeconds: integer('restSeconds'),
    notes: text('notes'),
    completedAt: integer('completedAt', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [index('sets_workout_exercise_idx').on(t.workoutExerciseId, t.position)],
);

export type User = typeof users.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type MuscleGroup = typeof muscleGroups.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type ExerciseMuscleGroup = typeof exerciseMuscleGroups.$inferSelect;
export type ExerciseImage = typeof exerciseImages.$inferSelect;
export type ExercisePreferences = typeof exercisePreferences.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutGroup = typeof workoutGroups.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSet = typeof sets.$inferSelect;
