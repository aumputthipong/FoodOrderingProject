ALTER TABLE `orders` ADD `queue_date` date;--> statement-breakpoint
ALTER TABLE `orders` ADD `queue_number` int;--> statement-breakpoint
-- Backfill existing orders: number them per shop per Bangkok (UTC+7) day, in order of creation.
UPDATE `orders` o
JOIN (
  SELECT `id`,
    DATE(DATE_ADD(`created_at`, INTERVAL 7 HOUR)) AS `qd`,
    ROW_NUMBER() OVER (
      PARTITION BY `shop_id`, DATE(DATE_ADD(`created_at`, INTERVAL 7 HOUR))
      ORDER BY `created_at`, `id`
    ) AS `qn`
  FROM `orders`
) n ON n.`id` = o.`id`
SET o.`queue_date` = n.`qd`, o.`queue_number` = n.`qn`;--> statement-breakpoint
ALTER TABLE `orders` MODIFY `queue_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY `queue_number` int NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_shop_id_queue_date_queue_number_unique` UNIQUE(`shop_id`,`queue_date`,`queue_number`);
