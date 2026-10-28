CREATE TABLE `exercise_images` (
	`id` text PRIMARY KEY NOT NULL,
	`exerciseId` text NOT NULL,
	`position` integer NOT NULL,
	`path` text NOT NULL,
	`license` text,
	`attribution` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercise_images_exercise_idx` ON `exercise_images` (`exerciseId`,`position`);--> statement-breakpoint
CREATE TABLE `exercise_muscle_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`exerciseId` text NOT NULL,
	`muscleGroupId` text NOT NULL,
	`role` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`muscleGroupId`) REFERENCES `muscle_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_muscle_groups_exercise_muscle_idx` ON `exercise_muscle_groups` (`exerciseId`,`muscleGroupId`);--> statement-breakpoint
CREATE INDEX `exercise_muscle_groups_muscle_idx` ON `exercise_muscle_groups` (`muscleGroupId`);--> statement-breakpoint
CREATE TABLE `exercise_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`exerciseId` text NOT NULL,
	`notes` text,
	`weightUnit` text,
	`distanceUnit` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_preferences_user_exercise_idx` ON `exercise_preferences` (`userId`,`exerciseId`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`source` text NOT NULL,
	`sourceId` text,
	`name` text NOT NULL,
	`description` text,
	`instructions` text,
	`category` text NOT NULL,
	`equipment` text,
	`loadType` text NOT NULL,
	`tracksReps` integer DEFAULT false NOT NULL,
	`tracksDuration` integer DEFAULT false NOT NULL,
	`tracksDistance` integer DEFAULT false NOT NULL,
	`defaultDurationSeconds` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_source_sourceId_idx` ON `exercises` (`source`,`sourceId`);--> statement-breakpoint
CREATE INDEX `exercises_name_idx` ON `exercises` (`name`);--> statement-breakpoint
CREATE TABLE `muscle_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `muscle_groups_key_unique` ON `muscle_groups` (`key`);--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workoutExerciseId` text NOT NULL,
	`position` integer NOT NULL,
	`setType` text DEFAULT 'normal' NOT NULL,
	`weightGrams` integer,
	`reps` integer,
	`durationSeconds` integer,
	`distanceMeters` integer,
	`rpe` real,
	`restSeconds` integer,
	`notes` text,
	`completedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`workoutExerciseId`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sets_workout_exercise_idx` ON `sets` (`workoutExerciseId`,`position`);--> statement-breakpoint
CREATE TABLE `template_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`templateId` text NOT NULL,
	`exerciseId` text NOT NULL,
	`position` integer NOT NULL,
	`phase` text DEFAULT 'main' NOT NULL,
	`groupKey` text,
	`groupType` text,
	`restSeconds` integer,
	`targetSets` integer,
	`targetReps` integer,
	`targetWeightGrams` integer,
	`targetDurationSeconds` integer,
	`targetDistanceMeters` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`templateId`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `template_exercises_template_idx` ON `template_exercises` (`templateId`,`position`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`weightUnit` text DEFAULT 'kg' NOT NULL,
	`distanceUnit` text DEFAULT 'metric' NOT NULL,
	`preset` text DEFAULT 'standard' NOT NULL,
	`features` text DEFAULT '{}' NOT NULL,
	`setupCompletedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_userId_unique` ON `user_settings` (`userId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);
--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workoutId` text NOT NULL,
	`exerciseId` text NOT NULL,
	`position` integer NOT NULL,
	`phase` text DEFAULT 'main' NOT NULL,
	`groupId` text,
	`restSeconds` integer,
	`notes` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`workoutId`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`groupId`) REFERENCES `workout_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_idx` ON `workout_exercises` (`workoutId`,`position`);--> statement-breakpoint
CREATE INDEX `workout_exercises_exercise_idx` ON `workout_exercises` (`exerciseId`);--> statement-breakpoint
CREATE TABLE `workout_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`workoutId` text NOT NULL,
	`groupType` text NOT NULL,
	`restSeconds` integer,
	`templateId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`workoutId`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`templateId`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_groups_workout_idx` ON `workout_groups` (`workoutId`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`startedAt` integer NOT NULL,
	`endedAt` integer,
	`notes` text,
	`templateId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`templateId`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workouts_user_started_idx` ON `workouts` (`userId`,`startedAt`);