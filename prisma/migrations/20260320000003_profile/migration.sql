-- CreateTable
CREATE TABLE "Profile" (
    "id"          TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "username"    TEXT         NOT NULL,
    "avatarUrl"   TEXT,
    "socialLinks" JSONB        NOT NULL DEFAULT '{}',
    "isPublic"    BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key"   ON "Profile"("userId");
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
