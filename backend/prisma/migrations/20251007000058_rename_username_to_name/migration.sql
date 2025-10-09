-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "PasswordResetCode_email_expiresAt_used_idx" ON "PasswordResetCode"("email", "expiresAt", "used");

-- AddForeignKey
ALTER TABLE "PasswordResetCode" ADD CONSTRAINT "PasswordResetCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable League
CREATE TABLE "League" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "leaderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "League_leaderId_fkey"
    FOREIGN KEY ("leaderId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable LeagueMember
CREATE TABLE "LeagueMember" (
  "leagueId" TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "points"   INTEGER NOT NULL DEFAULT 0,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeagueMember_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "League"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LeagueMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- PK compuesta y ayudas
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("leagueId","userId");
CREATE INDEX "LeagueMember_userId_idx" ON "LeagueMember"("userId");
