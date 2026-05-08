-- CreateEnum
CREATE TYPE "DocumentTargetType" AS ENUM ('COMPANY', 'PERSON');

-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('OWNER', 'PARTNER', 'LEGAL_REPRESENTATIVE', 'RESPONSIBLE', 'CONTACT', 'OTHER');

-- AlterTable
ALTER TABLE "DocumentRequest" ADD COLUMN     "personId" TEXT,
ADD COLUMN     "targetType" "DocumentTargetType" NOT NULL DEFAULT 'COMPANY';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "personId" TEXT;

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "role" "PersonRole" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Person_officeId_idx" ON "Person"("officeId");

-- CreateIndex
CREATE INDEX "Person_clientId_idx" ON "Person"("clientId");

-- CreateIndex
CREATE INDEX "Person_role_idx" ON "Person"("role");

-- CreateIndex
CREATE INDEX "DocumentRequest_personId_idx" ON "DocumentRequest"("personId");

-- CreateIndex
CREATE INDEX "DocumentRequest_targetType_idx" ON "DocumentRequest"("targetType");

-- CreateIndex
CREATE INDEX "Task_personId_idx" ON "Task"("personId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
