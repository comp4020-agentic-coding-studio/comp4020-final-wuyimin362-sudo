CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `players` ADD `username` text;--> statement-breakpoint
ALTER TABLE `players` ADD `password_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `players_username_unique` ON `players` (`username`);