// Simple queued update utility to rate limit project updates

export type UpdateFn = (projectId: string, payload: Record<string, unknown>) => Promise<void> | unknown;

const pending = new Map<string, {
  updateFn: UpdateFn;
  payloads: Record<string, unknown>[];
  resolvers: ((value?: unknown) => void)[];
}>();

let timer: ReturnType<typeof setTimeout> | null = null;
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
      const combined = payloads.reduce(
        (acc, payload) => ({ ...acc, ...payload }),
        {},
      );
      await updateFn(projectId, combined);
      resolvers.forEach((r) => r());
    } catch (err) {
      console.error('Failed to flush project update', err);
      resolvers.forEach((r) => r(err));
    }
  }
}

function scheduleFlush(): void {
  if (!timer) {
    timer = setTimeout(flushQueue, RATE_LIMIT);
  }
}

export function enqueueProjectUpdate(
  updateFn: UpdateFn,
  projectId: string,
  payload: Record<string, unknown>,
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
