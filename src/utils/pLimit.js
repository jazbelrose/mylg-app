export default function pLimit(concurrency) {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const { fn, resolve, reject } = queue.shift();
      run(fn).then(resolve, reject);
    }
  };

  const run = async (fn) => {
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

  return (fn) =>
    new Promise((resolve, reject) => {
      if (activeCount < concurrency) {
        run(fn).then(resolve, reject);
      } else {
        queue.push({ fn, resolve, reject });
      }
    });
}