// A saved copy of a list's fetched draw fields, in the browser (IndexedDB).
//
// `/collection` withholds the draw fields of every card outside its first window and fetches them in
// batches; at 24,000 cards that is 48 requests and about 2 MB a visit, every visit. The fields only
// change when the reader's data does, and the page already knows when that is (`savedListToken`,
// the page cache's key). So the fields are kept here under that token, and a visit handed the same
// token draws from them.
//
// Rules, all of them about the storage being untrusted and shared:
//   - EVERY call is wrapped: private windows, blocked site data, a full disk and a browser without
//     IndexedDB all answer "no copy" and the page fetches as it always did. Nothing here throws.
//   - ONE entry per list per device, so a second reader's first visit replaces the first's: a copy
//     belongs to whoever's token it carries, and the token carries the user.
//   - A copy is read only when its token EQUALS the one the server just handed this page. The
//     server is the authority; the browser never decides a copy is fresh.
//   - Sign-out deletes the database (`clearSavedFields`, called from every in-app sign-out surface). A session that ends elsewhere
//     leaves the entry until the next reader's visit replaces it; it can never be used by another reader, whose token differs.
//
// Deliberately not a library: one object store, three functions.

const DB_NAME = "the99-saved";
const STORE = "fields";
const VERSION = 1;

/** A storage call that neither succeeds nor fails (a stalled upgrade, a hung open) must not hold the page's fetching or a sign-out. */
const GIVE_UP_MS = 2_000;

/** Bumped by every clear, so a write that began before it never recreates what sign-out just deleted. */
let epoch = 0;

export type SavedFields = { token: string; fields: Record<string, object> };

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (db: IDBDatabase | null) => {
      // An open that answers after we gave up must not leave a connection that blocks the next delete.
      if (settled) db?.close();
      else resolve(db);
      settled = true;
    };
    setTimeout(() => settle(null), GIVE_UP_MS);
    try {
      if (typeof indexedDB === "undefined") return settle(null);
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        req.result.onversionchange = () => req.result.close();
        settle(req.result);
      };
      req.onerror = () => settle(null);
      req.onblocked = () => settle(null);
    } catch {
      // not a fallback: no storage means no saved copy, and the page fetches.
      settle(null);
    }
  });
}

/** The copy filed under `list`, or null (none, unreadable, or not shaped like one). */
export async function readSavedFields(list: string): Promise<SavedFields | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(list);
      req.onsuccess = () => {
        db.close();
        const v = req.result as Partial<SavedFields> | undefined;
        resolve(v && typeof v.token === "string" && v.fields && typeof v.fields === "object" ? (v as SavedFields) : null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

/** Files `saved` under `list`, replacing whatever was there. Resolves whether or not it was stored. */
export async function writeSavedFields(list: string, saved: SavedFields): Promise<void> {
  const at = epoch;
  const db = await open();
  if (!db) return;
  if (epoch !== at) return db.close();
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(saved, list);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

/** Deletes every saved copy: the sign-out step. Resolves whether or not anything was there. */
export function clearSavedFields(): Promise<void> {
  epoch += 1;
  return new Promise((resolve) => {
    setTimeout(resolve, GIVE_UP_MS);
    try {
      if (typeof indexedDB === "undefined") return resolve();
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}
