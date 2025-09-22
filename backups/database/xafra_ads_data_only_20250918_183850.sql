--
-- PostgreSQL database dump
--

-- Dumped from database version 13.21
-- Dumped by pg_dump version 17.4

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
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id_customer, name, short_name, mail, phone, country, operator) FROM stdin;
1	Digital-X	Ditial-X	xamir.castelblanco@xafratech.com	+573115126184	CR	KOLBI
2	Gomovil	Gomovil	gaston.troncoso@gomovil.co	+5491151611662	CR	KOLBI
\.


--
-- Data for Name: auth_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_users (id_auth, user_name, shared_key, api_key, active, creation_date, customer_id, password, status, expiration_date, description, permissions, login_count, last_login, modification_date) FROM stdin;
1	Digital-X	cust_1	xafra_mfpqcyvr_f9ab4fd209a828dcd1bce8005f660fae	1	2025-09-18 18:14:34.648	1	\N	1	\N	\N	\N	0	\N	\N
2	Gomovil	cust_2	xafra_mfpqwrai_6f4b47226e39ca34417bc6352276193c	1	2025-09-18 18:29:57.93	2	\N	1	\N	\N	[]	0	\N	1758220197930
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id_product, reference, name, url_redirect_success, active, id_customer, url_redirect_postback, method_postback, body_postback, is_qs, country, operator, random) FROM stdin;
1	Mind	Mind	https://lp.digital-x.com.co/costarica/kolbi/campaign1?tracking=<TRAKING>	1	1	https://postback.level23.nl/?currency=USD&handler=10969&hash=e318d10daa740097925099c721ec924b&payout=fillinpayout&tracker=<TRAKING>	GET		1	CR	KOLBI	0
2	Generic	Discovery Language	https://discovery.gomovil.co/lp/cr/kolbi/discovery/default5/?p=xafra&click=<TRAKING>	1	2	http://link.loremads.com/campaign/811/19?clickid=<TRAKING>	GET		1	CR	KOLBI	0
\.


--
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
-- Name: auth_users_id_auth_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_users_id_auth_seq', 2, true);


--
-- Name: campaign_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campaign_id_seq', 10, true);


--
-- Name: customers_id_customer_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_customer_seq', 2, true);


--
-- Name: products_id_product_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_product_seq', 2, true);


--
-- PostgreSQL database dump complete
--

