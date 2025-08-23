export default function pLimit<T>(concurrency: number) {
  const queue: Array<{ fn: () => Promise<T> | T; resolve: (value: T) => void; reject: (reason?: unknown) => void }> = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const { fn, resolve, reject } = queue.shift()!;
      run(fn).then(resolve, reject);
    }
  };

  const run = async (fn: () => Promise<T> | T): Promise<T> => {
    activeCount++;
    try {
      const result = await fn();
      next();
      return result;
    } catch (error) {
      next();
      throw error;
    }
  };

  return (fn: () => Promise<T> | T): Promise<T> =>
    new Promise((resolve, reject) => {
      if (activeCount < concurrency) {
        run(fn).then(resolve, reject);
      } else {
        queue.push({ fn, resolve, reject });
      }
    });
}