-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "option" INTEGER NOT NULL,
    "voter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PollVote_presentationId_elementId_idx" ON "PollVote"("presentationId", "elementId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_presentationId_elementId_voter_key" ON "PollVote"("presentationId", "elementId", "voter");

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
