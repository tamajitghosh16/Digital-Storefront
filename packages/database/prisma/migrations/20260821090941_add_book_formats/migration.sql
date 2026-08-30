-- CreateEnum
CREATE TYPE "BookFormat" AS ENUM ('PHYSICAL', 'EBOOK');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "bookFormats" "BookFormat"[] DEFAULT ARRAY[]::"BookFormat"[];
