CREATE TABLE `bodyweights` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`weightGrams` integer NOT NULL,
	`measuredAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bodyweights_user_measured_idx` ON `bodyweights` (`userId`,`measuredAt`);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `heightMillimeters` integer;