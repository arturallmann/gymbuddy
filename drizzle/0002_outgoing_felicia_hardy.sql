DROP INDEX `user_settings_userId_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_idx` ON `user_settings` (`userId`) WHERE "deletedAt" IS NULL;--> statement-breakpoint
DROP INDEX `exercise_preferences_user_exercise_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_preferences_user_exercise_idx` ON `exercise_preferences` (`userId`,`exerciseId`) WHERE "deletedAt" IS NULL;