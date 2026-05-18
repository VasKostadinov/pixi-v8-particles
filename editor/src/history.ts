// Snapshot-based undo/redo. Every value/structural mutation flows through ctx,
// so a single seam captures all edits: serialize the config to JSON, push the
// previous snapshot onto the past stack. Rapid value changes (slider drags)
// are coalesced via a short debounce into one history entry.

type Snapshot = string;

export interface HistoryOptions {
  getSnapshot(): Snapshot;
  applySnapshot(snapshot: Snapshot): void;
}

export interface History {
  recordValueChange(): void;
  recordStructuralChange(): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  subscribe(fn: () => void): () => void;
}

const MAX_ENTRIES = 100;
const VALUE_DEBOUNCE_MS = 250;

export function createHistory(opts: HistoryOptions): History {
  const past: Snapshot[] = [];
  const future: Snapshot[] = [];
  let present: Snapshot = opts.getSnapshot();
  const subscribers = new Set<() => void>();
  let pendingTimer: number | null = null;
  let applying = false;

  const notifySubs = () => {
    for (const fn of subscribers) fn();
  };

  const commit = () => {
    const next = opts.getSnapshot();
    if (next === present) return;
    past.push(present);
    if (past.length > MAX_ENTRIES) past.shift();
    present = next;
    future.length = 0;
    notifySubs();
  };

  const flushPending = () => {
    if (pendingTimer === null) return;
    clearTimeout(pendingTimer);
    pendingTimer = null;
    commit();
  };

  const applyAndCapture = (snap: Snapshot) => {
    applying = true;
    try {
      opts.applySnapshot(snap);
    } finally {
      applying = false;
    }
    // Re-render may inject defaults via ensure() — re-capture so present
    // matches the actual config state.
    present = opts.getSnapshot();
  };

  return {
    recordValueChange() {
      if (applying) return;
      if (pendingTimer !== null) clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(() => {
        pendingTimer = null;
        commit();
      }, VALUE_DEBOUNCE_MS);
    },

    recordStructuralChange() {
      if (applying) return;
      flushPending();
      commit();
    },

    undo() {
      flushPending();
      if (past.length === 0) return false;
      const snap = past.pop()!;
      future.push(present);
      applyAndCapture(snap);
      notifySubs();
      return true;
    },

    redo() {
      flushPending();
      if (future.length === 0) return false;
      const snap = future.pop()!;
      past.push(present);
      applyAndCapture(snap);
      notifySubs();
      return true;
    },

    canUndo() {
      return past.length > 0;
    },

    canRedo() {
      return future.length > 0;
    },

    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
