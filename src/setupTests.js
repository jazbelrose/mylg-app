import '@testing-library/jest-dom';

jest.mock('lucide-react', () => {
  const Icon = () => null;
  return new Proxy({}, {
    get: () => Icon,
  });
});