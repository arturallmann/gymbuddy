CREATE TABLE `app_state` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_state_key_unique` ON `app_state` (`key`);