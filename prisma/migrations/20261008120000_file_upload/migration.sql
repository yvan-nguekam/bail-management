-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "fileKey" TEXT;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "imageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];

