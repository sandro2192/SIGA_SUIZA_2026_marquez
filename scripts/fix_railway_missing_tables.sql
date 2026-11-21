-- Tablas del Core que faltaban en la base de datos de Railway (2026-11-20).
-- Ejecutar una sola vez contra la BD de Railway:
--   psql -h <host> -p <puerto> -U postgres -d railway -f scripts/fix_railway_missing_tables.sql

CREATE TABLE IF NOT EXISTS public.core_audit_logs (
    id integer NOT NULL,
    event_id character varying(50) NOT NULL,
    event_type character varying(100) NOT NULL,
    source character varying(50) NOT NULL,
    payload json NOT NULL,
    user_id integer,
    request_id character varying(50),
    "timestamp" timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.core_audit_logs_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.core_audit_logs_id_seq OWNED BY public.core_audit_logs.id;

CREATE TABLE IF NOT EXISTS public.core_modules (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    version character varying(20) NOT NULL,
    api_version character varying(20),
    description character varying(255),
    endpoints json NOT NULL,
    events json,
    permissions json,
    health_check character varying(100),
    config json,
    status character varying(50),
    is_active boolean,
    registered_at timestamp without time zone,
    last_health_check timestamp without time zone,
    compliance_data json
);

CREATE SEQUENCE IF NOT EXISTS public.core_modules_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.core_modules_id_seq OWNED BY public.core_modules.id;

CREATE TABLE IF NOT EXISTS public.core_role_permissions (
    role_id integer,
    permission_id integer
);

ALTER TABLE ONLY public.core_audit_logs
    ALTER COLUMN id SET DEFAULT nextval('public.core_audit_logs_id_seq'::regclass);

ALTER TABLE ONLY public.core_modules
    ALTER COLUMN id SET DEFAULT nextval('public.core_modules_id_seq'::regclass);

ALTER TABLE ONLY public.core_audit_logs
    DROP CONSTRAINT IF EXISTS core_audit_logs_pkey,
    ADD CONSTRAINT core_audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.core_modules
    DROP CONSTRAINT IF EXISTS core_modules_pkey,
    ADD CONSTRAINT core_modules_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_core_audit_logs_event_id ON public.core_audit_logs USING btree (event_id);
CREATE INDEX IF NOT EXISTS ix_core_audit_logs_event_type ON public.core_audit_logs USING btree (event_type);
CREATE INDEX IF NOT EXISTS ix_core_audit_logs_request_id ON public.core_audit_logs USING btree (request_id);
CREATE INDEX IF NOT EXISTS ix_core_audit_logs_source ON public.core_audit_logs USING btree (source);
CREATE INDEX IF NOT EXISTS ix_core_audit_logs_user_id ON public.core_audit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS ix_core_modules_id ON public.core_modules USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_core_modules_name ON public.core_modules USING btree (name);

ALTER TABLE ONLY public.core_role_permissions
    DROP CONSTRAINT IF EXISTS core_role_permissions_permission_id_fkey,
    ADD CONSTRAINT core_role_permissions_permission_id_fkey
        FOREIGN KEY (permission_id) REFERENCES public.core_permissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.core_role_permissions
    DROP CONSTRAINT IF EXISTS core_role_permissions_role_id_fkey,
    ADD CONSTRAINT core_role_permissions_role_id_fkey
        FOREIGN KEY (role_id) REFERENCES public.core_roles(id) ON DELETE CASCADE;
