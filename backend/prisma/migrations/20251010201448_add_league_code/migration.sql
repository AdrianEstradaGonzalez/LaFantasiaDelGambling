/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `League` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `League` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "League" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "League_code_key" ON "League"("code");
