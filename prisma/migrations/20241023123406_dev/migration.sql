-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "gridIndex" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createChallengeSig" TEXT NOT NULL,
    "correctGuessesSig" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incorrectGuessesSig" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "TxID" SERIAL NOT NULL,
    "challengeId" TEXT NOT NULL,
    "TxHash" TEXT NOT NULL,
    "ToUser" TEXT NOT NULL,
    "FromUser" TEXT NOT NULL,
    "TokenAmount" DOUBLE PRECISION NOT NULL,
    "Token" TEXT NOT NULL,
    "TxState" TEXT NOT NULL,
    "Timestamp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("TxID")
);

-- CreateTable
CREATE TABLE "_ReceivedChallenges" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_id_key" ON "Challenge"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_ReceivedChallenges_AB_unique" ON "_ReceivedChallenges"("A", "B");

-- CreateIndex
CREATE INDEX "_ReceivedChallenges_B_index" ON "_ReceivedChallenges"("B");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "User"("wallet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReceivedChallenges" ADD CONSTRAINT "_ReceivedChallenges_A_fkey" FOREIGN KEY ("A") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReceivedChallenges" ADD CONSTRAINT "_ReceivedChallenges_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
