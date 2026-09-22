/**
 * BUENO FREIGHT OS — COLLECTION CACHE
 *
 * Backs each collection with a server-authoritative cache.
 *
 * Replaces a design where localStorage *was* the database: reads returned
 * whatever the browser had, writes pushed the entire collection to the server
 * fire-and-forget, and every open tab re-fetched all seven collections every
 * five seconds.
 *
 * Three changes matter here:
 *
 *   1. Writes are per-record. Saving a list diffs it against the last known
 *      server state and sends only what changed, so two people editing
 *      different records stop overwriting each other.
 *
 *   2. Polling uses ETags, so an unchanged collection costs a 304 with no
 *      body instead of a full payload.
 *
 *   3. The cache is memory-first. localStorage is kept only as an offline
 *      read-through so a dropped connection shows the last known data rather
 *      than an empty screen — it is never treated as the truth.
 */

import { api, ApiError } from '@/lib/apiClient';

export type Row = Record<string, any>;

interface StoreOptions {
  /** API file name, e.g. "trips.php". */
  endpoint: string;
  /** localStorage key for the offline read-through cache. */
  cacheKey: string;
  /** Primary key field. */
  idField?: string;
}

function readCache(key: string): Row[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(key: string, rows: Row[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // Quota exceeded or storage disabled: the memory cache still works.
  }
}

/** Shallow comparison of the fields a caller might have edited. */
function rowsDiffer(a: Row, b: Row): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    // Server-managed bookkeeping is not a user edit.
    if (k === 'updated_at' || k === 'version' || k === 'createdAt') continue;
    const av = a[k];
    const bv = b[k];
    if (typeof av === 'object' && av !== null) {
      if (JSON.stringify(av) !== JSON.stringify(bv)) return true;
    } else if (av !== bv) {
      return true;
    }
  }
  return false;
}

/** Why a collection is empty, when it is empty for a reason. */
export interface ReadFailure {
  status: number;
  message: string;
}

export class CollectionStore {
  private rows: Row[] = [];
  private etag: string | null = null;
  private hydrated = false;
  private syncing: Promise<void> | null = null;
  private readonly idField: string;

  /**
   * Set when the server refused the last read.
   *
   * A refused read used to be indistinguishable from an empty collection: the
   * store quietly set zero rows and the screen showed an empty table with no
   * explanation. "Provisioned Accounts (0)" looked like a missing feature
   * rather than a permission the account does not hold, and there was nothing
   * on screen to tell the two apart.
   */
  private lastReadFailure: ReadFailure | null = null;

  /** Null when the last read succeeded. */
  readFailure(): ReadFailure | null {
    return this.lastReadFailure;
  }

  constructor(private readonly options: StoreOptions) {
    this.idField = options.idField ?? 'id';
  }

  /**
   * Current rows. Synchronous, because portal components read this during
   * render. Falls back to the offline cache until the first sync lands.
   */
  all(): Row[] {
    if (!this.hydrated) {
      this.rows = readCache(this.options.cacheKey);
      this.hydrated = true;
    }
    return this.rows;
  }

  find(id: string): Row | undefined {
    return this.all().find((r) => r[this.idField] === id);
  }

  private setRows(rows: Row[]): void {
    this.rows = rows;
    this.hydrated = true;
    writeCache(this.options.cacheKey, rows);
    notifyStateChanged();
  }

  /** Refresh from the server. Shares one request among concurrent callers. */
  async sync(): Promise<void> {
    if (this.syncing) return this.syncing;

    this.syncing = (async () => {
      try {
        const res = await api.get(this.options.endpoint, { etag: this.etag });

        if (res.notModified) return;

        this.etag = res.etag;
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        this.lastReadFailure = null;
        this.setRows(data);
      } catch (err) {
        if (err instanceof ApiError && (err.isForbidden || err.isUnauthenticated)) {
          // Not permitted to read this collection, or signed out. An empty
          // list is the correct view — keeping stale rows would show data the
          // user may no longer see — but record why, so the screen can say so
          // instead of presenting a refusal as "there is nothing here".
          this.lastReadFailure = {
            status: err.status,
            message: err.message || 'You do not have permission to view this.',
          };
          console.warn(
            `[store:${this.options.endpoint}] read refused (${err.status}): ${err.message}`
          );
          this.setRows([]);
          return;
        }
        // Network trouble: keep showing what we have.
        console.warn(`[store:${this.options.endpoint}] sync failed`, err);
      } finally {
        this.syncing = null;
      }
    })();

    return this.syncing;
  }

  /** Write one record and merge the server's copy back into the cache. */
  async upsert(record: Row): Promise<Row> {
    const { data } = await api.post(this.options.endpoint, {
      action: 'upsert',
      record,
    });

    const saved: Row = data?.record ?? record;
    const id = saved[this.idField];

    const next = [...this.all()];
    const index = next.findIndex((r) => r[this.idField] === id);
    if (index >= 0) next[index] = saved;
    else next.unshift(saved);

    this.setRows(next);
    return saved;
  }

  async remove(id: string): Promise<void> {
    await api.post(this.options.endpoint, { action: 'delete', id });
    this.setRows(this.all().filter((r) => r[this.idField] !== id));
  }

  /**
   * Save a whole list.
   *
   * Portals hand us the full collection because that is how the old API
   * worked. Rather than push all of it — which is what made concurrent edits
   * destroy each other — diff against what we last saw and send only the
   * records that actually changed.
   */
  async saveAll(incoming: Row[]): Promise<void> {
    const before = new Map(this.all().map((r) => [r[this.idField], r]));

    const changed = incoming.filter((row) => {
      const id = row[this.idField];
      if (!id) return true; // new record
      const previous = before.get(id);
      return !previous || rowsDiffer(previous, row);
    });

    // Update the local view immediately so the UI stays responsive.
    this.setRows(incoming);

    if (changed.length === 0) return;

    const failures: string[] = [];
    for (const row of changed) {
      try {
        await this.upsert(row);
      } catch (err) {
        const label = row[this.idField] ?? '(new)';
        failures.push(label);
        if (err instanceof ApiError && err.isConflict) {
          console.warn(
            `[store:${this.options.endpoint}] ${label} was changed by someone else; ` +
              'local edit not applied.'
          );
        } else {
          console.error(`[store:${this.options.endpoint}] failed to save ${label}`, err);
        }
      }
    }

    if (failures.length > 0) {
      // Pull the authoritative state so the UI stops showing edits that did
      // not persist.
      await this.sync();
      throw new ApiError(
        `${failures.length} record(s) could not be saved. The list has been refreshed.`,
        409,
        { failures }
      );
    }
  }

  clearLocal(): void {
    this.etag = null;
    this.setRows([]);
  }
}

// ─── Change notification ─────────────────────────────────────────────────────

let notifyScheduled = false;

/**
 * Tell the app something changed.
 *
 * Coalesced into one event per frame: a save that touches several stores
 * would otherwise re-render every portal once per store.
 */
export function notifyStateChanged(): void {
  if (typeof window === 'undefined' || notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    window.dispatchEvent(new Event('bueno_state_updated'));
  });
}
