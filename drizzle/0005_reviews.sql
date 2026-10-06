CREATE TABLE `reviews` (
	`match_id` integer NOT NULL,
	`reviewer_id` text NOT NULL,
	`reviewee_id` text NOT NULL,
	`serve` integer NOT NULL,
	`receive` integer NOT NULL,
	`forehand` integer NOT NULL,
	`backhand` integer NOT NULL,
	`footwork` integer NOT NULL,
	`tactics` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`match_id`, `reviewer_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewee_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
