# Medyze — Supabase backend

```
supabase/
  migrations/
    20260728120000_create_medicine_details.sql
    20260728160000_add_medicine_details_warnings_storage.sql
  seed/
    medicine_details.sql     generated seed — import this
    manual-review.md         medicines no trusted source could confirm
    SOURCES.md               which sources were used, and why the rest weren't
  policies/
    2026-07-26-public-read-only.sql
```

## Architecture

Medyze is a plain database-driven application. **Nothing in the running app
calls an AI model or any external service.** The deployed app needs no AI key
and no third-party API key of any kind — only the Supabase URL and publishable
key it already used.

```
  User opens a medicine
        │
        ▼
  Medicine detail page (Server Component)
        │  SELECT * FROM medicine_details WHERE medicine_id = $1
        ▼
   ┌─ row found ──► render the tabs
   └─ no row ─────► "Medicine information is currently unavailable."
```

Content is put into `medicine_details` **once**, offline, by a developer, from
public drug databases — never at runtime, and never by an AI model:

```
  Developer's machine                          Production
  ───────────────────                          ──────────
  npm run build:medicine-details               Next.js app
        │                                            │
        ├─ RxNorm (NLM)      ingredient validation   │
        ├─ openFDA           label sections          │
        ▼                                            ▼
  supabase/seed/medicine_details.sql ──► medicine_details ──► read-only
        (paste into the SQL Editor)
```

See [seed/SOURCES.md](./seed/SOURCES.md) for the source-by-source assessment,
including why the Indian government sources could not be used.

## Populating the data

### 1. (Optional) add the two extra columns

The generator emits whatever columns the live table has. `warnings` and
`storage_information` are **not** in the table today, so they are generated but
not written. To store them, apply
`migrations/20260728160000_add_medicine_details_warnings_storage.sql` in the
SQL Editor, then re-run the generator so the SQL file includes them.

### 2. Regenerate the seed (only if you changed something)

```bash
npm run build:medicine-details
```

Reads `medicines`, queries the public APIs, and rewrites `seed/medicine_details.sql`
and `seed/manual-review.md`. It performs **no** database writes — producing the
file and importing it are separate, deliberate steps.

### 3. Import

Paste `seed/medicine_details.sql` into the Supabase SQL Editor and run it. The
file is DML only — it creates nothing, alters nothing, and touches no table
other than `medicine_details`. Every statement is an upsert on the
`medicine_id` unique key, so it is safe to run repeatedly.

### 4. Verify

```bash
set -a && . ./.env.local && set +a && for t in medicines medicine_details; do printf "%-18s %s\n" "$t" "$(curl -s -o /dev/null -D- "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/$t?select=id" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -H 'Prefer: count=exact' -H 'Range: 0-0' | grep -i '^content-range' | tr -d '\r' | sed 's|.*/||')"; done
```

Medicines listed in `seed/manual-review.md` will legitimately have no row — no
trusted source could confirm their composition, so nothing was invented for
them. To find them in SQL:

```sql
select m.id, m.name
from public.medicines m
left join public.medicine_details d on d.medicine_id = m.id
where d.id is null
order by m.id;
```

## Notes

- **Before importing, nothing breaks.** The detail page still returns 200;
  Medicine Activity and Manufacturer Details fall back to the medicine's own
  columns, and the rest show the unavailable message.
- **Re-importing is safe** — upsert on `medicine_id`.
- **To refresh one medicine**, re-run the generator and re-import; the upsert
  overwrites in place.
