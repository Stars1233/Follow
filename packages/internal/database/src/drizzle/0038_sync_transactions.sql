CREATE TABLE `sync_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sync_transactions_created_at` ON `sync_transactions` (`created_at`);