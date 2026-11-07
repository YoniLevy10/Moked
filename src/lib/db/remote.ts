import { neon } from "@neondatabase/serverless";
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/server";

type Sql = ReturnType<typeof neon>;

export type DbResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

type Filter =
  | { kind: "eq" | "neq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] };

const IDENT = /^[a-z_][a-z0-9_]*$/;

/** Neon query() rejects raw JS arrays for jsonb parameters. */
function sqlParam(value: unknown): unknown {
  return Array.isArray(value) ? JSON.stringify(value) : value;
}
const CONFLICT: Record<string, string> = {
  profiles: "id",
  tenant_secrets: "tenant_id",
  tenant_processes: "tenant_id, process_key",
};

let sqlClient: Sql | null = null;

export function hasNeon(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function hasRemoteDb(): boolean {
  return hasNeon() || isSupabaseAdminConfigured();
}

function sql(): Sql {
  if (!process.env.DATABASE_URL) throw new Error("database_url_missing");
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`bad_identifier:${name}`);
  return name;
}

class NeonQuery implements PromiseLike<DbResult<unknown>> {
  private filters: Filter[] = [];
  private orderCol?: string;
  private orderAsc = true;
  private limitN?: number;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Record<string, unknown> | Array<Record<string, unknown>> | null =
    null;
  private shape: "many" | "single" | "maybe" = "many";
  private conflict?: string;

  constructor(private readonly table: string) {}

  select(): this {
    return this;
  }

  insert(row: Record<string, unknown> | Array<Record<string, unknown>>): this {
    this.mode = "insert";
    this.payload = row;
    return this;
  }

  update(row: Record<string, unknown>): this {
    this.mode = "update";
    this.payload = row;
    return this;
  }

  upsert(
    row: Record<string, unknown>,
    options?: { onConflict?: string },
  ): this {
    this.mode = "upsert";
    this.payload = row;
    this.conflict = options?.onConflict ?? CONFLICT[this.table];
    return this;
  }

  delete(): this {
    this.mode = "delete";
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ kind: "neq", column, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ kind: "in", column, values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  single(): this {
    this.shape = "single";
    return this;
  }

  maybeSingle(): this {
    this.shape = "maybe";
    return this;
  }

  then<TResult1 = DbResult<unknown>, TResult2 = never>(
    onfulfilled?:
      | ((value: DbResult<unknown>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<DbResult<unknown>> {
    try {
      const rows = await this.execute();
      if (this.shape === "many") return { data: rows, error: null };
      if (rows.length > 1) {
        return { data: null, error: { message: "multiple_rows" } };
      }
      if (rows.length === 0) {
        if (this.shape === "single") {
          return { data: null, error: { message: "no_rows" } };
        }
        return { data: null, error: null };
      }
      return { data: rows[0], error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "query_failed";
      return { data: null, error: { message } };
    }
  }

  private async execute(): Promise<Record<string, unknown>[]> {
    const params: unknown[] = [];
    const where = this.whereSql(params);
    const table = `public.${ident(this.table)}`;

    if (this.mode === "select") {
      const order = this.orderCol
        ? ` order by ${ident(this.orderCol)} ${this.orderAsc ? "asc" : "desc"}`
        : "";
      const limit = this.limitN != null ? ` limit ${Number(this.limitN)}` : "";
      return (await sql().query(
        `select * from ${table}${where}${order}${limit}`,
        params,
      )) as Record<string, unknown>[];
    }

    if (this.mode === "delete") {
      await sql().query(`delete from ${table}${where}`, params);
      return [];
    }

    const rows = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
    if (rows.length === 0) return [];
    const columns = Object.keys(rows[0]).map(ident);
    if (columns.length === 0) return [];

    if (this.mode === "update") {
      const row = rows[0];
      const sets = columns.map((column) => {
        params.push(sqlParam(row[column]));
        return `${column} = $${params.length}`;
      });
      const order = "";
      return (await sql().query(
        `update ${table} set ${sets.join(", ")}${where}${order} returning *`,
        params,
      )) as Record<string, unknown>[];
    }

    const values: string[] = [];
    for (const row of rows) {
      const slots = columns.map((column) => {
        params.push(sqlParam(row[column]));
        return `$${params.length}`;
      });
      values.push(`(${slots.join(", ")})`);
    }
    let statement = `insert into ${table} (${columns.join(", ")}) values ${values.join(", ")}`;
    if (this.mode === "upsert") {
      const conflict = (this.conflict ?? "id")
        .split(",")
        .map((part) => ident(part.trim()))
        .join(", ");
      const conflictSet = new Set(conflict.split(", ").map((part) => part.trim()));
      const updates = columns
        .filter((column) => !conflictSet.has(column))
        .map((column) => `${column} = excluded.${column}`);
      statement += ` on conflict (${conflict}) do update set ${
        updates.length ? updates.join(", ") : `${columns[0]} = excluded.${columns[0]}`
      }`;
    }
    statement += " returning *";
    return (await sql().query(statement, params)) as Record<string, unknown>[];
  }

  private whereSql(params: unknown[]): string {
    if (!this.filters.length) return "";
    const parts = this.filters.map((filter) => {
      const column = ident(filter.column);
      if (filter.kind === "in") {
        if (filter.values.length === 0) return "false";
        const slots = filter.values.map((value) => {
          params.push(value);
          return `$${params.length}`;
        });
        return `${column} in (${slots.join(", ")})`;
      }
      params.push(filter.value);
      const op = filter.kind === "neq" ? "<>" : "=";
      return `${column} ${op} $${params.length}`;
    });
    return ` where ${parts.join(" and ")}`;
  }
}

/** Loose query builder shared by Neon + Supabase admin clients. */
export type RemoteQuery = {
  select: (...args: unknown[]) => RemoteQuery;
  insert: (row: unknown) => RemoteQuery;
  update: (row: unknown) => RemoteQuery;
  upsert: (row: unknown, options?: { onConflict?: string }) => RemoteQuery;
  delete: () => RemoteQuery;
  eq: (column: string, value: unknown) => RemoteQuery;
  neq: (column: string, value: unknown) => RemoteQuery;
  in: (column: string, values: unknown[]) => RemoteQuery;
  order: (column: string, options?: { ascending?: boolean }) => RemoteQuery;
  limit: (n: number) => RemoteQuery;
  single: () => RemoteQuery;
  maybeSingle: () => RemoteQuery;
  then: PromiseLike<DbResult<unknown>>["then"];
};

type RemoteClient = { from: (table: string) => RemoteQuery };

export function getRemote(): RemoteClient {
  if (hasNeon()) {
    return {
      from(table: string) {
        ident(table);
        return new NeonQuery(table) as unknown as RemoteQuery;
      },
    };
  }
  return getSupabaseAdmin() as unknown as RemoteClient;
}
