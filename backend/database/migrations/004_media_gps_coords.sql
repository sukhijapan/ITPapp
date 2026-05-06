-- Migration: 004_media_gps_coords.sql
-- Description: Adds latitude and longitude columns to media table for evidence-based documentation

ALTER TABLE media ADD COLUMN latitude DECIMAL(9,6);
ALTER TABLE media ADD COLUMN longitude DECIMAL(9,6);
