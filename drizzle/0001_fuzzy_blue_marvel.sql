DROP INDEX `exercise_images_exercise_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_images_exercise_position_idx` ON `exercise_images` (`exerciseId`,`position`);