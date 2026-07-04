/**
 * Shared unwrap helpers for Supabase/PostgREST query results.
 *
 * Every repository adapter (app and worker) funnels the
 * `if (error) throw new Error(error.message)` ritual through these instead
 * of reinventing it inline.
 */

type QueryError = { message: string } | null;

/** Unwraps a `.single()` query: throws on error or missing row. */
export async function selectSingle<T>(
  query: PromiseLike<{ data: T; error: QueryError }>,
): Promise<NonNullable<T>> {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Expected one database row, found none.");
  }

  return data;
}

/** Unwraps a `.maybeSingle()` query: throws on error, null when no row. */
export async function selectMaybeSingle<T>(
  query: PromiseLike<{ data: T; error: QueryError }>,
): Promise<T | null> {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/** Unwraps a list query: throws on error, empty array when no rows. */
export async function selectRows<T>(
  query: PromiseLike<{ data: T[] | null; error: QueryError }>,
): Promise<T[]> {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/** Unwraps a `count: "exact", head: true` query: throws on error, 0 default. */
export async function selectCount(
  query: PromiseLike<{ count: number | null; error: QueryError }>,
): Promise<number> {
  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

/** Awaits a mutation whose data is not needed: throws on error. */
export async function throwOnError(
  query: PromiseLike<{ error: QueryError }>,
): Promise<void> {
  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}
