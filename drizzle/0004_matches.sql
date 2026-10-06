CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reporter_id` text NOT NULL,
	`opponent_id` text NOT NULL,
	`played_on` text NOT NULL,
	`venue` text NOT NULL,
	`reporter_games` integer NOT NULL,
	`opponent_games` integer NOT NULL,
	`status` text DEFAULT 'reported' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`confirmed_at` text,
	FOREIGN KEY (`reporter_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opponent_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
