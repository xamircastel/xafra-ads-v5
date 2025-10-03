-- CreateTable
CREATE TABLE "conversions" (
    "id" BIGSERIAL NOT NULL,
    "conversion_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" BIGINT NOT NULL,
    "tracking" VARCHAR(500) NOT NULL,
    "id_product" BIGINT,
    "msisdn" VARCHAR(20),
    "empello_token" VARCHAR(255),
    "source" VARCHAR(50) NOT NULL DEFAULT 'google',
    "status_post_back" SMALLINT,
    "date_post_back" TIMESTAMP(3),
    "campaign" VARCHAR(255),
    "country" VARCHAR(10),
    "operator" VARCHAR(50),

    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_conversions_tracking" ON "conversions"("tracking");

-- CreateIndex
CREATE INDEX "idx_conversions_customer" ON "conversions"("customer_id");

-- CreateIndex
CREATE INDEX "idx_conversions_date" ON "conversions"("conversion_date");

-- CreateIndex
CREATE INDEX "idx_conversions_status" ON "conversions"("status_post_back");

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id_customer") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddComment
COMMENT ON TABLE "conversions" IS 'Google Ads conversions tracking for ENTEL Peru';
COMMENT ON COLUMN "conversions"."tracking" IS 'Google Click ID (gclid)';
COMMENT ON COLUMN "conversions"."empello_token" IS 'Optional Empello integration token';
COMMENT ON COLUMN "conversions"."status_post_back" IS '1=success, 2=failed, NULL=pending';
