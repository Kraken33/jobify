import { SupabaseClient } from '@supabase/supabase-js';

export function createMockSupabaseClient(): SupabaseClient {
  const tables: Record<string, any[]> = {
    profiles: [],
    search_sessions: [],
    job_matches: [],
    scan_checkpoints: [],
  };

  function createQueryBuilder(tableName: string) {
    let operation: 'select' | 'update' | 'delete' = 'select';
    let updatePayload: any = null;
    let filterFn: ((row: any) => boolean) = () => true;
    let orderFn: ((a: any, b: any) => number) | null = null;
    let limitCount: number | null = null;

    const builder: any = {
      select: () => {
        operation = 'select';
        return builder;
      },
      delete: () => {
        operation = 'delete';
        return builder;
      },
      update: (fields: any) => {
        operation = 'update';
        updatePayload = fields;
        return builder;
      },
      eq: (col: string, val: any) => {
        const prev = filterFn;
        filterFn = (row) => prev(row) && row[col] === val;
        return builder;
      },
      neq: (col: string, val: any) => {
        const prev = filterFn;
        filterFn = (row) => prev(row) && row[col] !== val;
        return builder;
      },
      is: (col: string, val: any) => {
        const prev = filterFn;
        filterFn = (row) => prev(row) && (val === null ? row[col] == null : row[col] === val);
        return builder;
      },
      or: (conditionString: string) => {
        const prev = filterFn;
        const parts = conditionString.split(',').map((p) => p.trim());
        filterFn = (row) => {
          if (!prev(row)) return false;
          return parts.some((part) => {
            const [col, op, ...valParts] = part.split('.');
            const val = valParts.join('.');
            if (op === 'eq') return row[col] === val;
            if (op === 'is' && val === 'null') return row[col] == null;
            return false;
          });
        };
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        const asc = opts?.ascending ?? true;
        orderFn = (a, b) => {
          if (a[col] < b[col]) return asc ? -1 : 1;
          if (a[col] > b[col]) return asc ? 1 : -1;
          return 0;
        };
        return builder;
      },
      limit: (n: number) => {
        limitCount = n;
        return builder;
      },
      single: async () => {
        const res = await builder;
        return { data: res.data?.[0] || null, error: res.data?.[0] ? null : new Error('Not found') };
      },
      maybeSingle: async () => {
        const res = await builder;
        return { data: res.data?.[0] || null, error: null };
      },
      insert: async (rows: any[]) => {
        const inserted = rows.map((r) => ({
          id: r.id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          created_at: r.created_at || new Date().toISOString(),
          ...r,
        }));
        tables[tableName] = tables[tableName] || [];
        tables[tableName].push(...inserted);
        return {
          data: inserted,
          error: null,
          select: () => ({
            single: async () => ({ data: inserted[0], error: null }),
          }),
        };
      },
      upsert: async (rowOrRows: any, opts?: { onConflict?: string }) => {
        tables[tableName] = tables[tableName] || [];
        const rowsToProcess = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        const savedRows: any[] = [];

        for (const row of rowsToProcess) {
          let idx = -1;
          if (opts?.onConflict === 'session_id,provider_id') {
            idx = tables[tableName].findIndex(
              (r) => r.session_id === row.session_id && r.provider_id === row.provider_id
            );
          } else if (opts?.onConflict === 'session_id,provider_job_id') {
            idx = tables[tableName].findIndex(
              (r) => r.session_id === row.session_id && r.provider_job_id === row.provider_job_id
            );
          } else if (opts?.onConflict === 'provider_job_id') {
            idx = tables[tableName].findIndex(
              (r) => r.provider_job_id === row.provider_job_id
            );
          } else if (row.id) {
            idx = tables[tableName].findIndex((r) => r.id === row.id);
          }

          const saved = {
            id: row.id || (idx >= 0 ? tables[tableName][idx].id : `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
            created_at: idx >= 0 ? tables[tableName][idx].created_at : new Date().toISOString(),
            ...row,
          };

          if (idx >= 0) {
            tables[tableName][idx] = saved;
          } else {
            tables[tableName].push(saved);
          }
          savedRows.push(saved);
        }

        return {
          data: savedRows,
          error: null,
          select: () => ({
            single: async () => ({ data: savedRows[0], error: null }),
          }),
        };
      },
      then: (resolve: any) => {
        tables[tableName] = tables[tableName] || [];
        if (operation === 'delete') {
          tables[tableName] = tables[tableName].filter((r) => !filterFn(r));
          resolve({ data: null, error: null });
          return;
        }

        if (operation === 'update') {
          let count = 0;
          tables[tableName] = tables[tableName].map((r) => {
            if (filterFn(r)) {
              count++;
              return { ...r, ...updatePayload };
            }
            return r;
          });
          resolve({ data: null, error: null, count });
          return;
        }

        // operation === 'select'
        let rows = tables[tableName].filter(filterFn);
        if (orderFn) {
          rows.sort(orderFn);
        }
        if (limitCount !== null) {
          rows = rows.slice(0, limitCount);
        }
        resolve({ data: rows, error: null });
      },
    };

    return builder;
  }

  return {
    from: (tableName: string) => createQueryBuilder(tableName),
  } as unknown as SupabaseClient;
}
