ALTER TABLE "List" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "List_shareToken_key" ON "List"("shareToken");
