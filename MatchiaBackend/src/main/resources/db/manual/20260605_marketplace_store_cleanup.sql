BEGIN;

DO $$
BEGIN
    IF to_regclass('public.marketplace_store') IS NULL
       AND to_regclass('public.bank_store') IS NOT NULL THEN
        ALTER TABLE public.bank_store RENAME TO marketplace_store;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.marketplace_store_module') IS NULL
       AND to_regclass('public.bank_store_module') IS NOT NULL THEN
        ALTER TABLE public.bank_store_module RENAME TO marketplace_store_module;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'marketplace_store_module'
          AND column_name = 'bank_store_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'marketplace_store_module'
          AND column_name = 'marketplace_store_id'
    ) THEN
        ALTER TABLE public.marketplace_store_module
            RENAME COLUMN bank_store_id TO marketplace_store_id;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.marketplace_store') IS NOT NULL
       AND to_regclass('public.bank_store') IS NOT NULL THEN
        INSERT INTO public.marketplace_store (marketplace_id, store_id, enabled, visible)
        SELECT old_store.marketplace_id, old_store.store_id, old_store.enabled, old_store.visible
        FROM public.bank_store old_store
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.marketplace_store new_store
            WHERE new_store.marketplace_id = old_store.marketplace_id
              AND new_store.store_id = old_store.store_id
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.marketplace_store_module') IS NOT NULL
       AND to_regclass('public.bank_store') IS NOT NULL
       AND to_regclass('public.marketplace_store') IS NOT NULL THEN
        UPDATE public.marketplace_store_module module_link
        SET marketplace_store_id = new_store.id
        FROM public.bank_store old_store
        JOIN public.marketplace_store new_store
          ON new_store.marketplace_id = old_store.marketplace_id
         AND new_store.store_id = old_store.store_id
        WHERE module_link.marketplace_store_id = old_store.id
          AND module_link.marketplace_store_id <> new_store.id;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.marketplace_store_module') IS NOT NULL
       AND to_regclass('public.bank_store_module') IS NOT NULL
       AND to_regclass('public.bank_store') IS NOT NULL
       AND to_regclass('public.marketplace_store') IS NOT NULL THEN
        INSERT INTO public.marketplace_store_module (marketplace_store_id, module_id, enabled, visible)
        SELECT new_store.id, old_module.module_id, old_module.enabled, old_module.visible
        FROM public.bank_store_module old_module
        JOIN public.bank_store old_store ON old_store.id = old_module.bank_store_id
        JOIN public.marketplace_store new_store
          ON new_store.marketplace_id = old_store.marketplace_id
         AND new_store.store_id = old_store.store_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.marketplace_store_module existing_module
            WHERE existing_module.marketplace_store_id = new_store.id
              AND existing_module.module_id = old_module.module_id
        );
    END IF;
END $$;

DO $$
DECLARE
    fk_name text;
BEGIN
    FOR fk_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN unnest(con.conkey) AS key(attnum) ON true
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = key.attnum
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'marketplace_store'
          AND att.attname = 'bank_id'
          AND con.contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE public.marketplace_store DROP CONSTRAINT %I', fk_name);
    END LOOP;
END $$;

ALTER TABLE IF EXISTS public.marketplace_store
    DROP COLUMN IF EXISTS bank_id;

CREATE UNIQUE INDEX IF NOT EXISTS uk_marketplace_store_marketplace_store
    ON public.marketplace_store (marketplace_id, store_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_marketplace_store_module_store_module
    ON public.marketplace_store_module (marketplace_store_id, module_id);

DROP TABLE IF EXISTS public.bank_store_module CASCADE;
DROP TABLE IF EXISTS public.bank_store CASCADE;
DROP TABLE IF EXISTS public.bank_branding CASCADE;

COMMIT;
