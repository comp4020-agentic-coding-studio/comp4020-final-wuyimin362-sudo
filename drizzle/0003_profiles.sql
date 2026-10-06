CREATE TABLE `avatars` (
	`player_id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`data` blob NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `home_venues` (
	`player_id` text NOT NULL,
	`venue` text NOT NULL,
	PRIMARY KEY(`player_id`, `venue`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `players` ADD `blade` text;--> statement-breakpoint
ALTER TABLE `players` ADD `forehand_rubber` text;--> statement-breakpoint
ALTER TABLE `players` ADD `backhand_rubber` text;--> statement-breakpoint
ALTER TABLE `players` ADD `grip` text;--> statement-breakpoint
ALTER TABLE `players` ADD `style` text;--> statement-breakpoint
ALTER TABLE `players` ADD `ratings_central_id` text;