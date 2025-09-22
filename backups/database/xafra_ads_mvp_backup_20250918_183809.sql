--
-- PostgreSQL database dump
--

-- Dumped from database version 13.21
-- Dumped by pg_dump version 17.4

-- Started on 2025-09-18 18:38:09

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 16919)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 3722 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 200 (class 1259 OID 16920)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- TOC entry 210 (class 1259 OID 16982)
-- Name: ads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ads (
    ads_id bigint NOT NULL,
    ads_conf_id bigint NOT NULL,
    ads_def_id bigint NOT NULL,
    priority smallint,
    status smallint,
    cdate timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ads OWNER TO postgres;

--
-- TOC entry 209 (class 1259 OID 16980)
-- Name: ads_ads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ads_ads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ads_ads_id_seq OWNER TO postgres;

--
-- TOC entry 3724 (class 0 OID 0)
-- Dependencies: 209
-- Name: ads_ads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ads_ads_id_seq OWNED BY public.ads.ads_id;


--
-- TOC entry 212 (class 1259 OID 16991)
-- Name: ads_conf; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ads_conf (
    ads_conf_id bigint NOT NULL,
    name character varying(100),
    status smallint,
    cdate timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ads_conf OWNER TO postgres;

--
-- TOC entry 211 (class 1259 OID 16989)
-- Name: ads_conf_ads_conf_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ads_conf_ads_conf_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ads_conf_ads_conf_id_seq OWNER TO postgres;

--
-- TOC entry 3725 (class 0 OID 0)
-- Dependencies: 211
-- Name: ads_conf_ads_conf_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ads_conf_ads_conf_id_seq OWNED BY public.ads_conf.ads_conf_id;


--
-- TOC entry 214 (class 1259 OID 17000)
-- Name: ads_def; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ads_def (
    ads_def_id bigint NOT NULL,
    ads_conf_id bigint NOT NULL,
    product_id bigint NOT NULL,
    use_tracking smallint,
    status smallint,
    cdate timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ads_def OWNER TO postgres;

--
-- TOC entry 213 (class 1259 OID 16998)
-- Name: ads_def_ads_def_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ads_def_ads_def_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ads_def_ads_def_id_seq OWNER TO postgres;

--
-- TOC entry 3726 (class 0 OID 0)
-- Dependencies: 213
-- Name: ads_def_ads_def_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ads_def_ads_def_id_seq OWNED BY public.ads_def.ads_def_id;


--
-- TOC entry 204 (class 1259 OID 16945)
-- Name: auth_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_users (
    id_auth bigint NOT NULL,
    user_name character varying(50),
    shared_key character varying(50),
    api_key character varying(50),
    active smallint,
    creation_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_id bigint,
    password character varying(255),
    status smallint DEFAULT 1,
    expiration_date bigint,
    description character varying(500),
    permissions character varying(1000),
    login_count integer DEFAULT 0,
    last_login bigint,
    modification_date bigint
);


ALTER TABLE public.auth_users OWNER TO postgres;

--
-- TOC entry 203 (class 1259 OID 16943)
-- Name: auth_users_id_auth_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auth_users_id_auth_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auth_users_id_auth_seq OWNER TO postgres;

--
-- TOC entry 3727 (class 0 OID 0)
-- Dependencies: 203
-- Name: auth_users_id_auth_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auth_users_id_auth_seq OWNED BY public.auth_users.id_auth;


--
-- TOC entry 216 (class 1259 OID 17009)
-- Name: blacklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blacklist (
    id bigint NOT NULL,
    msisdn character varying(20),
    creation_date timestamp(3) without time zone,
    product_id bigint,
    type smallint
);


ALTER TABLE public.blacklist OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 17007)
-- Name: blacklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blacklist_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blacklist_id_seq OWNER TO postgres;

--
-- TOC entry 3728 (class 0 OID 0)
-- Dependencies: 215
-- Name: blacklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blacklist_id_seq OWNED BY public.blacklist.id;


--
-- TOC entry 208 (class 1259 OID 16970)
-- Name: campaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign (
    id bigint NOT NULL,
    creation_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    modification_date timestamp(3) without time zone,
    id_product bigint,
    tracking character varying(500),
    status smallint,
    uuid character varying(50),
    status_post_back smallint,
    date_post_back timestamp(3) without time zone,
    params text,
    xafra_tracking_id character varying(100),
    short_tracking character varying(50),
    country character varying(50),
    operator character varying(50)
);


ALTER TABLE public.campaign OWNER TO postgres;

--
-- TOC entry 207 (class 1259 OID 16968)
-- Name: campaign_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaign_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_id_seq OWNER TO postgres;

--
-- TOC entry 3729 (class 0 OID 0)
-- Dependencies: 207
-- Name: campaign_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaign_id_seq OWNED BY public.campaign.id;


--
-- TOC entry 202 (class 1259 OID 16934)
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id_customer bigint NOT NULL,
    name character varying(1000),
    short_name character varying(100),
    mail character varying(200),
    phone character varying(20),
    country character varying(10),
    operator character varying(50)
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- TOC entry 201 (class 1259 OID 16932)
-- Name: customers_id_customer_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_customer_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_customer_seq OWNER TO postgres;

--
-- TOC entry 3730 (class 0 OID 0)
-- Dependencies: 201
-- Name: customers_id_customer_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_customer_seq OWNED BY public.customers.id_customer;


--
-- TOC entry 206 (class 1259 OID 16959)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id_product bigint NOT NULL,
    reference character varying(100),
    name character varying(500),
    url_redirect_success character varying(1000),
    active smallint,
    id_customer bigint,
    url_redirect_postback character varying(1000),
    method_postback character varying(20),
    body_postback character varying(2500),
    is_qs smallint,
    country character varying(10),
    operator character varying(50),
    random smallint
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 205 (class 1259 OID 16957)
-- Name: products_id_product_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_product_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_product_seq OWNER TO postgres;

--
-- TOC entry 3731 (class 0 OID 0)
-- Dependencies: 205
-- Name: products_id_product_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_product_seq OWNED BY public.products.id_product;


--
-- TOC entry 218 (class 1259 OID 17017)
-- Name: xafra_campaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.xafra_campaign (
    id bigint NOT NULL,
    xafra_id bigint NOT NULL,
    product_id bigint,
    tracking character varying(50) NOT NULL,
    status smallint,
    uuid character varying(50),
    cdate timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    mdate timestamp(3) without time zone
);


ALTER TABLE public.xafra_campaign OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 17015)
-- Name: xafra_campaign_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.xafra_campaign_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xafra_campaign_id_seq OWNER TO postgres;

--
-- TOC entry 3732 (class 0 OID 0)
-- Dependencies: 217
-- Name: xafra_campaign_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.xafra_campaign_id_seq OWNED BY public.xafra_campaign.id;


--
-- TOC entry 3520 (class 2604 OID 16985)
-- Name: ads ads_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ads ALTER COLUMN ads_id SET DEFAULT nextval('public.ads_ads_id_seq'::regclass);


--
-- TOC entry 3522 (class 2604 OID 16994)
-- Name: ads_conf ads_conf_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ads_conf ALTER COLUMN ads_conf_id SET DEFAULT nextval('public.ads_conf_ads_conf_id_seq'::regclass);


--
-- TOC entry 3524 (class 2604 OID 17003)
-- Name: ads_def ads_def_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ads_def ALTER COLUMN ads_def_id SET DEFAULT nextval('public.ads_def_ads_def_id_seq'::regclass);


--
-- TOC entry 3513 (class 2604 OID 16948)
-- Name: auth_users id_auth; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users ALTER COLUMN id_auth SET DEFAULT nextval('public.auth_users_id_auth_seq'::regclass);


--
-- TOC entry 3526 (class 2604 OID 17012)
-- Name: blacklist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist ALTER COLUMN id SET DEFAULT nextval('public.blacklist_id_seq'::regclass);


--
-- TOC entry 3518 (class 2604 OID 16973)
-- Name: campaign id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign ALTER COLUMN id SET DEFAULT nextval('public.campaign_id_seq'::regclass);


--
-- TOC entry 3512 (class 2604 OID 16937)
-- Name: customers id_customer; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id_customer SET DEFAULT nextval('public.customers_id_customer_seq'::regclass);


--
-- TOC entry 3517 (class 2604 OID 16962)
-- Name: products id_product; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id_product SET DEFAULT nextval('public.products_id_product_seq'::regclass);


--
-- TOC entry 3527 (class 2604 OID 17020)
-- Name: xafra_campaign id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.xafra_campaign ALTER COLUMN id SET DEFAULT nextval('public.xafra_campaign_id_seq'::regclass);


--
-- TOC entry 3698 (class 0 OID 16920)
-- Dependencies: 200
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
7a2ac1af-7dd1-4220-85d9-ba639603adee	babc01b63db2273b72d10a8032b116fd8dc6939097b58b06e604fb262772e539	2025-09-18 17:07:30.625312+00	20250918170729_add_auth_fields	\N	\N	2025-09-18 17:07:29.949667+00	1
\.


--
-- TOC entry 3708 (class 0 OID 16982)
-- Dependencies: 210
-- Data for Name: ads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ads (ads_id, ads_conf_id, ads_def_id, priority, status, cdate) FROM stdin;
\.


--
-- TOC entry 3710 (class 0 OID 16991)
-- Dependencies: 212
-- Data for Name: ads_conf; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ads_conf (ads_conf_id, name, status, cdate) FROM stdin;
\.


--
-- TOC entry 3712 (class 0 OID 17000)
-- Dependencies: 214
-- Data for Name: ads_def; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ads_def (ads_def_id, ads_conf_id, product_id, use_tracking, status, cdate) FROM stdin;
\.


--
-- TOC entry 3702 (class 0 OID 16945)
-- Dependencies: 204
-- Data for Name: auth_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_users (id_auth, user_name, shared_key, api_key, active, creation_date, customer_id, password, status, expiration_date, description, permissions, login_count, last_login, modification_date) FROM stdin;
1	Digital-X	cust_1	xafra_mfpqcyvr_f9ab4fd209a828dcd1bce8005f660fae	1	2025-09-18 18:14:34.648	1	\N	1	\N	\N	\N	0	\N	\N
2	Gomovil	cust_2	xafra_mfpqwrai_6f4b47226e39ca34417bc6352276193c	1	2025-09-18 18:29:57.93	2	\N	1	\N	\N	[]	0	\N	1758220197930
\.


--
-- TOC entry 3714 (class 0 OID 17009)
-- Dependencies: 216
-- Data for Name: blacklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blacklist (id, msisdn, creation_date, product_id, type) FROM stdin;
\.


--
-- TOC entry 3706 (class 0 OID 16970)
-- Dependencies: 208
-- Data for Name: campaign; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaign (id, creation_date, modification_date, id_product, tracking, status, uuid, status_post_back, date_post_back, params, xafra_tracking_id, short_tracking, country, operator) FROM stdin;
2	2025-09-18 20:37:20.314	\N	1	ATR_CR_KOLBI_mfpvgk6w_10ea1cac	2	26f4a9bf-3f19-4caf-9901-0f1aa6ccf32d	\N	\N	{"autoTracking":true,"sourceRoute":"/ads/tr/","generatedAt":"2025-09-18T20:37:20.314Z"}	XAFRA_AUTO_mfpvgk6w_9a586182	\N	CR	KOLBI
3	2025-09-18 20:53:21.016	\N	1	ATR_CR_KOLBI_mfpw15h2_ecc7461b	2	609f98b2-423c-4e4c-8f8c-05fd755037cc	\N	\N	{"autoTracking":true,"sourceRoute":"/ads/tr/","generatedAt":"2025-09-18T20:53:21.016Z"}	XAFRA_AUTO_mfpw15h3_3798942a	\N	CR	KOLBI
4	2025-09-18 21:29:32.754	\N	1	ATR_CR_KOLBI_mfpxbp74_ffbf9a74	2	7a7584da-59d4-496a-9bd1-a035e9a123c6	\N	\N	{"autoTracking":true,"sourceRoute":"/ads/tr/","generatedAt":"2025-09-18T21:29:32.754Z"}	XAFRA_AUTO_mfpxbp75_808d125b	\N	CR	KOLBI
1	2025-09-18 20:36:35.022	2025-09-18 21:48:27.847	1	testxamir180920250704	2	7476b499-329a-4fcf-a14b-e67b74882995	\N	\N	\N	XAFRA_mfpvfl8r_491ed478	gr132	CR	KOLBI
5	2025-09-18 22:16:05.931	\N	1	ATR_CR_KOLBI_mfpyzkfd_ee885c2e	2	563d4eb5-7ba3-4b51-95a5-99f5cbed0361	\N	\N	{"autoTracking":true,"sourceRoute":"/ads/tr/","generatedAt":"2025-09-18T22:16:05.931Z"}	XAFRA_AUTO_mfpyzkfe_ba0bea72	\N	CR	KOLBI
6	2025-09-18 22:28:21.044	2025-09-18 22:37:49.251	1	testxamir180920251728	1	3573df43-856e-4bfd-9a97-d25899b8f42b	\N	\N	{"confirmation":{"confirmed_at":"2025-09-18T22:37:49.251Z","confirmation_method":"simple_get","tracking_used":"testxamir180920251728","is_kolbi_short":false,"ip_address":"::1","user_agent":"PostmanRuntime/7.46.1"}}	XAFRA_mfpzfbn7_a99af7d5	\N	CR	KOLBI
7	2025-09-18 22:39:51.418	2025-09-18 22:41:01.397	1	testxamir180920251739	1	b53e962a-5ce7-43ee-81af-11be03239b87	\N	\N	{"confirmation":{"confirmed_at":"2025-09-18T22:41:01.397Z","confirmation_method":"simple_get","tracking_used":"testxamir180920251739","is_kolbi_short":false,"ip_address":"::1","user_agent":"PostmanRuntime/7.46.1"}}	XAFRA_mfpzu4c7_71a15d81	\N	CR	KOLBI
8	2025-09-18 22:48:47.234	2025-09-18 22:49:43.459	1	testxamir180920251748	1	97b181a5-41ac-4f3f-b93d-bd03b0c5fa5e	\N	\N	{"confirmation":{"confirmed_at":"2025-09-18T22:49:43.459Z","confirmation_method":"simple_get","tracking_used":"testxamir180920251748","is_kolbi_short":false,"ip_address":"::1","user_agent":"PostmanRuntime/7.46.1"}}	XAFRA_mfq05ls2_1b346014	\N	CR	KOLBI
9	2025-09-18 23:03:53.391	2025-09-18 23:04:52.305	1	testxamir180920251603	1	7f8a6348-6fe4-406a-8b7a-2549f94dd4e1	1	2025-09-18 23:04:53.802	{"confirmation":{"confirmed_at":"2025-09-18T23:04:52.305Z","confirmation_method":"simple_get","tracking_used":"testxamir180920251603","is_kolbi_short":false,"ip_address":"::1","user_agent":"PostmanRuntime/7.46.1"}}	XAFRA_mfq0p0z2_261e74b1	\N	CR	KOLBI
10	2025-09-18 23:06:00.992	2025-09-18 23:07:53.454	1	ATR_CR_KOLBI_mfq0rrfi_4f522f86	1	c14177fc-5a95-4a97-b6a0-e1ce0f510e19	1	2025-09-18 23:07:54.754	{"0":"{","1":"\\"","2":"a","3":"u","4":"t","5":"o","6":"T","7":"r","8":"a","9":"c","10":"k","11":"i","12":"n","13":"g","14":"\\"","15":":","16":"t","17":"r","18":"u","19":"e","20":",","21":"\\"","22":"s","23":"o","24":"u","25":"r","26":"c","27":"e","28":"R","29":"o","30":"u","31":"t","32":"e","33":"\\"","34":":","35":"\\"","36":"/","37":"a","38":"d","39":"s","40":"/","41":"t","42":"r","43":"/","44":"\\"","45":",","46":"\\"","47":"g","48":"e","49":"n","50":"e","51":"r","52":"a","53":"t","54":"e","55":"d","56":"A","57":"t","58":"\\"","59":":","60":"\\"","61":"2","62":"0","63":"2","64":"5","65":"-","66":"0","67":"9","68":"-","69":"1","70":"8","71":"T","72":"2","73":"3","74":":","75":"0","76":"6","77":":","78":"0","79":"0","80":".","81":"9","82":"9","83":"2","84":"Z","85":"\\"","86":"}","confirmation":{"confirmed_at":"2025-09-18T23:07:53.454Z","confirmation_method":"simple_get","tracking_used":"gr133","is_kolbi_short":true,"ip_address":"::1","user_agent":"PostmanRuntime/7.46.1"}}	XAFRA_AUTO_mfq0rrfj_4c6e3fa7	gr133	CR	KOLBI
\.


--
-- TOC entry 3700 (class 0 OID 16934)
-- Dependencies: 202
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id_customer, name, short_name, mail, phone, country, operator) FROM stdin;
1	Digital-X	Ditial-X	xamir.castelblanco@xafratech.com	+573115126184	CR	KOLBI
2	Gomovil	Gomovil	gaston.troncoso@gomovil.co	+5491151611662	CR	KOLBI
\.


--
-- TOC entry 3704 (class 0 OID 16959)
-- Dependencies: 206
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id_product, reference, name, url_redirect_success, active, id_customer, url_redirect_postback, method_postback, body_postback, is_qs, country, operator, random) FROM stdin;
1	Mind	Mind	https://lp.digital-x.com.co/costarica/kolbi/campaign1?tracking=<TRAKING>	1	1	https://postback.level23.nl/?currency=USD&handler=10969&hash=e318d10daa740097925099c721ec924b&payout=fillinpayout&tracker=<TRAKING>	GET		1	CR	KOLBI	0
2	Generic	Discovery Language	https://discovery.gomovil.co/lp/cr/kolbi/discovery/default5/?p=xafra&click=<TRAKING>	1	2	http://link.loremads.com/campaign/811/19?clickid=<TRAKING>	GET		1	CR	KOLBI	0
\.


--
-- TOC entry 3716 (class 0 OID 17017)
-- Dependencies: 218
-- Data for Name: xafra_campaign; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.xafra_campaign (id, xafra_id, product_id, tracking, status, uuid, cdate, mdate) FROM stdin;
\.


--
-- TOC entry 3733 (class 0 OID 0)
-- Dependencies: 209
-- Name: ads_ads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ads_ads_id_seq', 1, false);


--
-- TOC entry 3734 (class 0 OID 0)
-- Dependencies: 211
-- Name: ads_conf_ads_conf_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ads_conf_ads_conf_id_seq', 1, false);


--
-- TOC entry 3735 (class 0 OID 0)
-- Dependencies: 213
-- Name: ads_def_ads_def_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ads_def_ads_def_id_seq', 1, false);


--
-- TOC entry 3736 (class 0 OID 0)
-- Dependencies: 203
-- Name: auth_users_id_auth_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_users_id_auth_seq', 2, true);


--
-- TOC entry 3737 (class 0 OID 0)
-- Dependencies: 215
-- Name: blacklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.blacklist_id_seq', 1, false);


--
-- TOC entry 3738 (class 0 OID 0)
-- Dependencies: 207
-- Name: campaign_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campaign_id_seq', 10, true);


--
-- TOC entry 3739 (class 0 OID 0)
-- Dependencies: 201
-- Name: customers_id_customer_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_customer_seq', 2, true);


--
-- TOC entry 3740 (class 0 OID 0)
-- Dependencies: 205
-- Name: products_id_product_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_product_seq', 2, true);


--
-- TOC entry 3741 (class 0 OID 0)
-- Dependencies: 217
-- Name: xafra_campaign_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.xafra_campaign_id_seq', 1, false);


--
-- TOC entry 3530 (class 2606 OID 16929)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3551 (class 2606 OID 16997)
-- Name: ads_conf ads_conf_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ads_conf
    ADD CONSTRAINT ads_conf_pkey PRIMARY KEY (ads_conf_id);


--
-- TOC entry 3553 (class 2606 OID 17006)
-- Name: ads_def ads_def_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ads_def
    ADD CONSTRAINT ads_def_pkey PRIMARY KEY (ads_def_id);


--
-- TOC entry 3547 (class 2606 OID 16988)
-- Name: ads ads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_pkey PRIMARY KEY (ads_id);


--
-- TOC entry 3534 (class 2606 OID 16956)
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id_auth);


--
-- TOC entry 3556 (class 2606 OID 17014)
-- Name: blacklist blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist
    ADD CONSTRAINT blacklist_pkey PRIMARY KEY (id);


--
-- TOC entry 3541 (class 2606 OID 16979)
-- Name: campaign campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign
    ADD CONSTRAINT campaign_pkey PRIMARY KEY (id);


--
-- TOC entry 3532 (class 2606 OID 16942)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id_customer);


--
-- TOC entry 3536 (class 2606 OID 16967)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id_product);


--
-- TOC entry 3560 (class 2606 OID 17023)
-- Name: xafra_campaign xafra_campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.xafra_campaign
    ADD CONSTRAINT xafra_campaign_pkey PRIMARY KEY (id);


--
-- TOC entry 3548 (class 1259 OID 17031)
-- Name: ads_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ads_priority_idx ON public.ads USING btree (priority);


--
-- TOC entry 3549 (class 1259 OID 17032)
-- Name: ads_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ads_status_idx ON public.ads USING btree (status);


--
-- TOC entry 3554 (class 1259 OID 17033)
-- Name: blacklist_msisdn_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX blacklist_msisdn_idx ON public.blacklist USING btree (msisdn);


--
-- TOC entry 3557 (class 1259 OID 17034)
-- Name: blacklist_product_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX blacklist_product_id_idx ON public.blacklist USING btree (product_id);


--
-- TOC entry 3558 (class 1259 OID 17035)
-- Name: blacklist_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX blacklist_type_idx ON public.blacklist USING btree (type);


--
-- TOC entry 3537 (class 1259 OID 17030)
-- Name: campaign_country_operator_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaign_country_operator_idx ON public.campaign USING btree (country, operator);


--
-- TOC entry 3538 (class 1259 OID 17028)
-- Name: campaign_creation_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaign_creation_date_idx ON public.campaign USING btree (creation_date);


--
-- TOC entry 3539 (class 1259 OID 17029)
-- Name: campaign_id_product_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaign_id_product_status_idx ON public.campaign USING btree (id_product, status);


--
-- TOC entry 3542 (class 1259 OID 17025)
-- Name: campaign_short_tracking_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaign_short_tracking_idx ON public.campaign USING btree (short_tracking);


--
-- TOC entry 3543 (class 1259 OID 17027)
-- Name: campaign_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaign_status_idx ON public.campaign USING btree (status);


--
-- TOC entry 3544 (class 1259 OID 17024)
-- Name: campaign_tracking_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaign_tracking_idx ON public.campaign USING btree (tracking);


--
-- TOC entry 3545 (class 1259 OID 17026)
-- Name: campaign_xafra_tracking_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaign_xafra_tracking_id_idx ON public.campaign USING btree (xafra_tracking_id);


--
-- TOC entry 3561 (class 1259 OID 17036)
-- Name: xafra_campaign_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX xafra_campaign_status_idx ON public.xafra_campaign USING btree (status);


--
-- TOC entry 3562 (class 1259 OID 17037)
-- Name: xafra_campaign_tracking_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX xafra_campaign_tracking_idx ON public.xafra_campaign USING btree (tracking);


--
-- TOC entry 3566 (class 2606 OID 17058)
-- Name: ads ads_ads_conf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_ads_conf_id_fkey FOREIGN KEY (ads_conf_id) REFERENCES public.ads_conf(ads_conf_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3567 (class 2606 OID 17053)
-- Name: ads ads_ads_def_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ads
    ADD CONSTRAINT ads_ads_def_id_fkey FOREIGN KEY (ads_def_id) REFERENCES public.ads_def(ads_def_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 3563 (class 2606 OID 17038)
-- Name: auth_users auth_users_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id_customer) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3565 (class 2606 OID 17048)
-- Name: campaign campaign_id_product_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign
    ADD CONSTRAINT campaign_id_product_fkey FOREIGN KEY (id_product) REFERENCES public.products(id_product) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3564 (class 2606 OID 17043)
-- Name: products products_id_customer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_id_customer_fkey FOREIGN KEY (id_customer) REFERENCES public.customers(id_customer) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3723 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


-- Completed on 2025-09-18 18:38:20

--
-- PostgreSQL database dump complete
--

