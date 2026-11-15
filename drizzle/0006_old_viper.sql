DROP INDEX `exercise_images_exercise_position_idx`;--> statement-breakpoint
ALTER TABLE `exercise_images` ADD `storedFile` text;--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_images_exercise_position_idx` ON `exercise_images` (`exerciseId`,`position`) WHERE "deletedAt" IS NULL;