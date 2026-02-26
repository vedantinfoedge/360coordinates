-- Migration: Add project_type field to properties table
-- This allows distinguishing between regular properties and upcoming/pre-launch projects

ALTER TABLE `properties` 
ADD COLUMN `project_type` VARCHAR(50) DEFAULT NULL COMMENT 'Type of project: NULL or empty = regular property, "upcoming" = upcoming/pre-launch project' 
AFTER `property_type`;

-- Add index for filtering upcoming projects
CREATE INDEX `idx_project_type` ON `properties` (`project_type`);

-- Optional: Add a column to store additional upcoming project data as JSON
-- This allows storing project-specific fields without schema changes
ALTER TABLE `properties` 
ADD COLUMN `upcoming_project_data` JSON DEFAULT NULL COMMENT 'Additional data for upcoming projects (JSON format)'
AFTER `project_type`;

