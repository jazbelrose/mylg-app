interface QueueEntry {
  updateFn: (projectId: string, payload: unknown) => Promise<unknown>;
  payloads: unknown[];
  resolvers: (() => void)[];
}

const pending = new Map<string, QueueEntry>();
let timer: NodeJS.Timeout | null = null;
const RATE_LIMIT = 1000; // 1 second debounce/rate limit

async function flushQueue(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const entries = Array.from(pending.entries());
  pending.clear();
  for (const [projectId, { updateFn, payloads, resolvers }] of entries) {
    try {
      const combined = payloads.some(Array.isArray)
        ? payloads[payloads.length - 1]
        : payloads.reduce<Record<string, unknown>>(
            (acc, payload) => ({ ...acc, ...(payload as Record<string, unknown>) }),
            {}
          );
      await updateFn(projectId, combined);
      resolvers.forEach((r) => r());
    } catch (err) {
      console.error('Failed to flush project update', err);
      // For error cases, just log them but still resolve normally
      resolvers.forEach((r) => r());
    }
  }
}

function scheduleFlush(): void {
  if (!timer) {
    timer = setTimeout(flushQueue, RATE_LIMIT);
  }
}

export function enqueueProjectUpdate(
  updateFn: (projectId: string, payload: unknown) => Promise<unknown>,
  projectId: string,
  payload: unknown
): Promise<void> {
  if (!updateFn || !projectId || !payload) return Promise.resolve();
  return new Promise((resolve) => {
    const entry = pending.get(projectId) || {
      updateFn,
      payloads: [],
      resolvers: [],
    };
    entry.updateFn = updateFn;
    entry.payloads.push(payload);
    entry.resolvers.push(resolve);
    pending.set(projectId, entry);
    scheduleFlush();
  });
}

export { flushQueue };

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pending.size) {
      flushQueue();
    }
  });
}