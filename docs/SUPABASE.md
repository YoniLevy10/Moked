# MOKED — Supabase

## פרויקט יעד

| | |
|--|--|
| URL | https://pgsmselyieizacwdsdjl.supabase.co |
| Project ref | `pgsmselyieizacwdsdjl` |

## Env (Vercel + `.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://pgsmselyieizacwdsdjl.supabase.co
# אפשר גם בלי PUBLIC — הקוד מקבל את שניהם:
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>   # או SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=<service_role>   # שרת בלבד — לא לדפדפן / לא לגיט
```

כש־`SUPABASE_SERVICE_ROLE_KEY` מוגדר — `src/lib/store/db.ts` ו־auth כותבים ל־Postgres במקום `.data/`.

## מיגרציה

`supabase/migrations/20260908210000_moked_core.sql` — כבר הורצה על הפרויקט.

`supabase/migrations/20260908225400_business_events.sql` — טבלת `business_events` לאירועים עסקיים מדידים (תוצאות דשבורד). להריץ אם עדיין לא קיימת.
