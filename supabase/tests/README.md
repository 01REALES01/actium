# Supabase tests

Tests SQL ejecutables con `psql`. Cada archivo es independiente y debe poder
correrse sobre una base con el seed de [`supabase/seed.sql`](../seed.sql) cargado.

Todos los tests envuelven sus cambios en `BEGIN; ... ROLLBACK;` para no dejar
estado residual — pueden correrse repetidamente contra la misma DB.

## Cómo correr

### Local (Supabase CLI)

```bash
supabase db reset            # aplica todas las migraciones + seed
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -v ON_ERROR_STOP=1 \
  -f supabase/tests/01_rls_tenant_isolation.sql
```

### Cloud (cuidado: no correr en producción con datos reales)

Antes de correr en cloud, crear una **branch de DB** desde el dashboard
(Settings → Branches) y conectarse a esa rama. Asegurarse de que el seed
haya corrido en la rama (no se corre automático):

```bash
psql "$SUPABASE_DB_URL_BRANCH" \
  -v ON_ERROR_STOP=1 \
  -f supabase/seed.sql

psql "$SUPABASE_DB_URL_BRANCH" \
  -v ON_ERROR_STOP=1 \
  -f supabase/tests/01_rls_tenant_isolation.sql
```

`SUPABASE_DB_URL_BRANCH` se toma de Settings → Database → Direct connection
de la branch (puerto 5432, no el pooler).

## Salida esperada

Cada assert imprime una línea `NOTICE: OK [label] = N`. Al terminar:

```
NOTICE:  ========================================
NOTICE:  OK — todos los asserts pasaron
NOTICE:  ========================================
```

Si algún assert falla, `psql` aborta con `ERROR: ASSERT FAIL [label]: esperaba X, obtuvo Y`.

## Verificar que el test efectivamente prueba algo

Cambiar un valor esperado en [01_rls_tenant_isolation.sql](01_rls_tenant_isolation.sql)
(p.ej. esperar `5` proyectos en lugar de `2` para super_admin) y correrlo:
debe fallar con `ASSERT FAIL`. Revertir el cambio.

## Archivos

| Archivo | Qué prueba |
|---|---|
| `01_rls_tenant_isolation.sql` | Aislamiento entre subempresas, jerarquía de roles, inmutabilidad de `auditoria_logs`, herencia de RLS en vistas. |
