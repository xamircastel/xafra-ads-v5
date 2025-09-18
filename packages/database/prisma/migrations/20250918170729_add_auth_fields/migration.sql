-- CreateTable
CREATE TABLE "customers" (
    "id_customer" BIGSERIAL NOT NULL,
    "name" VARCHAR(1000),
    "short_name" VARCHAR(100),
    "mail" VARCHAR(200),
    "phone" VARCHAR(20),
    "country" VARCHAR(10),
    "operator" VARCHAR(50),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id_customer")
);

-- CreateTable
CREATE TABLE "auth_users" (
    "id_auth" BIGSERIAL NOT NULL,
    "user_name" VARCHAR(50),
    "shared_key" VARCHAR(50),
    "api_key" VARCHAR(50),
    "active" SMALLINT,
    "creation_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "customer_id" BIGINT,
    "password" VARCHAR(255),
    "status" SMALLINT DEFAULT 1,
    "expiration_date" BIGINT,
    "description" VARCHAR(500),
    "permissions" VARCHAR(1000),
    "login_count" INTEGER DEFAULT 0,
    "last_login" BIGINT,
    "modification_date" BIGINT,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id_auth")
);

-- CreateTable
CREATE TABLE "products" (
    "id_product" BIGSERIAL NOT NULL,
    "reference" VARCHAR(100),
    "name" VARCHAR(500),
    "url_redirect_success" VARCHAR(1000),
    "active" SMALLINT,
    "id_customer" BIGINT,
    "url_redirect_postback" VARCHAR(1000),
    "method_postback" VARCHAR(20),
    "body_postback" VARCHAR(2500),
    "is_qs" SMALLINT,
    "country" VARCHAR(10),
    "operator" VARCHAR(50),
    "random" SMALLINT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id_product")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" BIGSERIAL NOT NULL,
    "creation_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "modification_date" TIMESTAMP(3),
    "id_product" BIGINT,
    "tracking" VARCHAR(500),
    "status" SMALLINT,
    "uuid" VARCHAR(50),
    "status_post_back" SMALLINT,
    "date_post_back" TIMESTAMP(3),
    "params" TEXT,
    "xafra_tracking_id" VARCHAR(100),
    "short_tracking" VARCHAR(50),
    "country" VARCHAR(50),
    "operator" VARCHAR(50),

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "ads_id" BIGSERIAL NOT NULL,
    "ads_conf_id" BIGINT NOT NULL,
    "ads_def_id" BIGINT NOT NULL,
    "priority" SMALLINT,
    "status" SMALLINT,
    "cdate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("ads_id")
);

-- CreateTable
CREATE TABLE "ads_conf" (
    "ads_conf_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100),
    "status" SMALLINT,
    "cdate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ads_conf_pkey" PRIMARY KEY ("ads_conf_id")
);

-- CreateTable
CREATE TABLE "ads_def" (
    "ads_def_id" BIGSERIAL NOT NULL,
    "ads_conf_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "use_tracking" SMALLINT,
    "status" SMALLINT,
    "cdate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ads_def_pkey" PRIMARY KEY ("ads_def_id")
);

-- CreateTable
CREATE TABLE "blacklist" (
    "id" BIGSERIAL NOT NULL,
    "msisdn" VARCHAR(20),
    "creation_date" TIMESTAMP(3),
    "product_id" BIGINT,
    "type" SMALLINT,

    CONSTRAINT "blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xafra_campaign" (
    "id" BIGSERIAL NOT NULL,
    "xafra_id" BIGINT NOT NULL,
    "product_id" BIGINT,
    "tracking" VARCHAR(50) NOT NULL,
    "status" SMALLINT,
    "uuid" VARCHAR(50),
    "cdate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "mdate" TIMESTAMP(3),

    CONSTRAINT "xafra_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_tracking_idx" ON "campaign"("tracking");

-- CreateIndex
CREATE INDEX "campaign_short_tracking_idx" ON "campaign"("short_tracking");

-- CreateIndex
CREATE INDEX "campaign_xafra_tracking_id_idx" ON "campaign"("xafra_tracking_id");

-- CreateIndex
CREATE INDEX "campaign_status_idx" ON "campaign"("status");

-- CreateIndex
CREATE INDEX "campaign_creation_date_idx" ON "campaign"("creation_date");

-- CreateIndex
CREATE INDEX "campaign_id_product_status_idx" ON "campaign"("id_product", "status");

-- CreateIndex
CREATE INDEX "campaign_country_operator_idx" ON "campaign"("country", "operator");

-- CreateIndex
CREATE INDEX "ads_priority_idx" ON "ads"("priority");

-- CreateIndex
CREATE INDEX "ads_status_idx" ON "ads"("status");

-- CreateIndex
CREATE INDEX "blacklist_msisdn_idx" ON "blacklist"("msisdn");

-- CreateIndex
CREATE INDEX "blacklist_product_id_idx" ON "blacklist"("product_id");

-- CreateIndex
CREATE INDEX "blacklist_type_idx" ON "blacklist"("type");

-- CreateIndex
CREATE INDEX "xafra_campaign_status_idx" ON "xafra_campaign"("status");

-- CreateIndex
CREATE INDEX "xafra_campaign_tracking_idx" ON "xafra_campaign"("tracking");

-- AddForeignKey
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id_customer") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_id_customer_fkey" FOREIGN KEY ("id_customer") REFERENCES "customers"("id_customer") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_id_product_fkey" FOREIGN KEY ("id_product") REFERENCES "products"("id_product") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_ads_def_id_fkey" FOREIGN KEY ("ads_def_id") REFERENCES "ads_def"("ads_def_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_ads_conf_id_fkey" FOREIGN KEY ("ads_conf_id") REFERENCES "ads_conf"("ads_conf_id") ON DELETE RESTRICT ON UPDATE CASCADE;
