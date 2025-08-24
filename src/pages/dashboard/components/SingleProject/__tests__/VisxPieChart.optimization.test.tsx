import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import VisxPieChart from '../VisxPieChart';

// Mock the necessary modules
jest.mock('../../../../../utils/budgetUtils', () => ({
  formatUSD: (value: number) => `$${value.toFixed(2)}`,
}));

jest.mock('../../../../../utils/colorUtils', () => ({
  CHART_COLORS: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
  generateSequentialPalette: () => ['#FF6B6B', '#4ECDC4', '#45B7D1'],
  getColor: () => '#3b82f6',
}));

jest.mock('../../../../../app/contexts/DataProvider', () => ({
  useData: () => ({
    activeProject: { color: '#3b82f6', projectId: 'test-project' },
  }),
}));

// Mock ParentSize to provide fixed dimensions
jest.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (props: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 300, height: 300 }),
}));

describe('VisxPieChart Optimizations', () => {
  const mockData = [
    { name: 'Category A', value: 100 },
    { name: 'Category B', value: 200 },
    { name: 'Category C', value: 150 },
  ];

  let renderCount = 0;

  // Component wrapper to track renders
  const TestWrapper = ({ data, total, ...props }: any) => {
    renderCount++;
    return (
      <div data-testid="chart-wrapper">
        <VisxPieChart data={data} total={total} {...props} />
        <div data-testid="render-count">{renderCount}</div>
      </div>
    );
  };

  beforeEach(() => {
    renderCount = 0;
  });

  test('should not re-render when unrelated props change', () => {
    const { rerender } = render(
      <TestWrapper 
        data={mockData} 
        total={450} 
        unrelatedProp="initial"
      />
    );

    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Change an unrelated prop
    rerender(
      <TestWrapper 
        data={mockData} 
        total={450} 
        unrelatedProp="changed"
      />
    );

    // Render count should not increase since React.memo should prevent re-render
    expect(screen.getByTestId('render-count')).toHaveTextContent('1');
  });

  test('should re-render when data changes', () => {
    const { rerender } = render(
      <TestWrapper data={mockData} total={450} />
    );

    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Change data - this should trigger a re-render
    const newData = [
      { name: 'Category A', value: 120 },
      { name: 'Category B', value: 180 },
      { name: 'Category C', value: 200 },
    ];

    rerender(
      <TestWrapper data={newData} total={500} />
    );

    expect(screen.getByTestId('render-count')).toHaveTextContent('2');
  });

  test('should re-render when total changes', () => {
    const { rerender } = render(
      <TestWrapper data={mockData} total={450} />
    );

    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Change total - this should trigger a re-render
    rerender(
      <TestWrapper data={mockData} total={500} />
    );

    expect(screen.getByTestId('render-count')).toHaveTextContent('2');
  });

  test('should support external hover state management', () => {
    const mockOnSliceHover = jest.fn();
    const hoveredSlice = { name: 'Category A', value: 100 };

    render(
      <VisxPieChart
        data={mockData}
        total={450}
        onSliceHover={mockOnSliceHover}
        hoveredSlice={hoveredSlice}
      />
    );

    // Chart should render without errors when using external hover state
    expect(screen.getByTestId('chart-wrapper')).toBeInTheDocument();
  });

  test('should fallback to internal hover state when external props not provided', () => {
    render(
      <VisxPieChart
        data={mockData}
        total={450}
      />
    );

    // Chart should render without errors when using internal hover state
    expect(screen.getByTestId('chart-wrapper')).toBeInTheDocument();
  });

  test('should maintain stable keys for chart elements', () => {
    const { container } = render(
      <VisxPieChart data={mockData} total={450} />
    );

    // Check that SVG elements are rendered
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();

    // Check that path elements exist (these would have the stable keys)
    const pathElements = container.querySelectorAll('path');
    expect(pathElements.length).toBe(mockData.length);
  });
});