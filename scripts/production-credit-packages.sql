-- Production SQL script to create credit packages
-- Run this on your PostgreSQL production database

-- Clear existing packages (optional - remove this line if you want to keep existing ones)
DELETE FROM "CreditPackage";

-- Insert the 4 credit packages (using random strings for IDs)
INSERT INTO "CreditPackage" (id, name, credits, price, "isPopular", "isActive", "createdAt", "updatedAt") VALUES
('clx1a2b3c4d5e6f7g8h9i0j1', 'Starter Pack', 50, 50.0, false, true, NOW(), NOW()),
('clx2b3c4d5e6f7g8h9i0j1k2', 'Value Pack', 100, 100.0, true, true, NOW(), NOW()),
('clx3c4d5e6f7g8h9i0j1k2l3', 'Premium Pack', 200, 200.0, false, true, NOW(), NOW()),
('clx4d5e6f7g8h9i0j1k2l3m4', 'Ultimate Pack', 500, 500.0, false, true, NOW(), NOW());

-- Verify the packages were created
SELECT name, credits, price, "isPopular", "isActive" FROM "CreditPackage" ORDER BY credits;