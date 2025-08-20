interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

export default function pLimit(concurrency: number) {
  const queue: QueueItem<any>[] = [];
  let activeCount = 0;

  const next = (): void => {
    activeCount--;
    if (queue.length > 0) {
      const { fn, resolve, reject } = queue.shift()!;
      run(fn).then(resolve, reject);
    }
  };

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
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

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      if (activeCount < concurrency) {
        run(fn).then(resolve, reject);
      } else {
        queue.push({ fn, resolve, reject });
      }
    });
}