-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailLeases" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailMaintenance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailPayments" BOOLEAN NOT NULL DEFAULT true;

