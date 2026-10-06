-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "text" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transcript_orgId_idx" ON "Transcript"("orgId");
