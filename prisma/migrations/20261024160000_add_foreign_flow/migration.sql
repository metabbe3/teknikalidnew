-- CreateTable
CREATE TABLE "ForeignFlow" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "foreignBuy" DECIMAL(20,2) NOT NULL,
    "foreignSell" DECIMAL(20,2) NOT NULL,

    CONSTRAINT "ForeignFlow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForeignFlow_stockId_date_key" ON "ForeignFlow"("stockId", "date");

-- CreateIndex
CREATE INDEX "ForeignFlow_date_foreignBuy_idx" ON "ForeignFlow"("date", "foreignBuy" DESC);

-- CreateIndex
CREATE INDEX "ForeignFlow_date_foreignSell_idx" ON "ForeignFlow"("date", "foreignSell" DESC);

-- AddForeignKey
ALTER TABLE "ForeignFlow" ADD CONSTRAINT "ForeignFlow_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
