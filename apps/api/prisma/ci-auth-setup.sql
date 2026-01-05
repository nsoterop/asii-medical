CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth'
      AND p.proname = 'uid'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $$ SELECT NULL::uuid $$;
  END IF;
END $$;
