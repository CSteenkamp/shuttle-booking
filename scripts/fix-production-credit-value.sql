-- Production SQL script to fix creditValue setting
-- Run this on your PostgreSQL production database
-- This eliminates the "Save R12000" calculations

-- Update or insert creditValue setting to R1
INSERT INTO "Settings" (id, key, value, description, "updatedAt") VALUES
('fix-credit-value-001', 'creditValue', '1', 'Cost per credit in South African Rand', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = '1',
  "updatedAt" = NOW();

-- Verify the setting was updated
SELECT key, value, description, "updatedAt" FROM "Settings" WHERE key = 'creditValue';