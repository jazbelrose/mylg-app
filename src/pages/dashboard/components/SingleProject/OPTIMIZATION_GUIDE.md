# VisxPieChart Performance Optimizations

## Overview

The `VisxPieChart` component has been optimized to prevent unnecessary re-renders while maintaining full backward compatibility. These optimizations specifically address the issue where socket events and other parent state changes cause the chart to re-render unnecessarily.

## Key Optimizations

### 1. React.memo with Custom Comparator

The component is now wrapped in `React.memo` with a custom `arePropsEqual` function that performs shallow comparison of relevant props:

- `data` - Chart data array
- `total` - Total value for center display
- `colors` - Color palette
- `formatTooltip` - Tooltip formatting function
- Other configuration props

This prevents re-renders when only unrelated parent state changes.

### 2. Memoized Expensive Computations

Expensive operations are now cached with `useMemo`:

- **Palette generation**: Only recalculated when colors, colorMode, or data length changes
- **Pie computations**: Data sorting and processing logic cached
- **Callback functions**: Tooltip and hover handlers memoized

### 3. External Hover State Management (Optional)

New optional props allow moving hover state outside the component:

```tsx
interface VisxPieChartProps {
  // ... existing props
  onSliceHover?: (slice: PieDatum | null, event?: { x: number; y: number }) => void;
  hoveredSlice?: PieDatum | null;
}
```

When these props are provided, hover management moves to the parent component, preventing chart re-renders on hover events.

### 4. Optimized Animation

- Animations only trigger when actual data values change (using `usePrevious` hook)
- Stable keys using `name-value` combination prevent unnecessary DOM updates
- Hover animations are managed separately from data change animations

## Usage

### Basic Usage (Backward Compatible)

```tsx
// Existing code continues to work unchanged
<VisxPieChart
  data={pieData}
  total={totalValue}
  colors={colors}
  formatTooltip={formatTooltip}
  colorMode="sequential"
/>
```

### Optimal Performance Usage

For maximum performance, especially in components with frequent re-renders:

```tsx
const ParentComponent = () => {
  const [hoveredSlice, setHoveredSlice] = useState<PieDatum | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleSliceHover = useCallback((slice: PieDatum | null, event?: { x: number; y: number }) => {
    setHoveredSlice(slice);
    if (event) {
      setTooltipPosition({ x: event.x, y: event.y });
    }
  }, []);

  const formatTooltip = useCallback((d: PieDatum) => {
    return `${d.name}: ${formatUSD(d.value)}`;
  }, []);

  return (
    <>
      <VisxPieChart
        data={pieData}
        total={totalValue}
        colors={colors}
        formatTooltip={formatTooltip}
        colorMode="sequential"
        onSliceHover={handleSliceHover}
        hoveredSlice={hoveredSlice}
      />
      {hoveredSlice && (
        <CustomTooltip
          data={hoveredSlice}
          position={tooltipPosition}
          formatTooltip={formatTooltip}
        />
      )}
    </>
  );
};
```

## Performance Benefits

### Before Optimization
- Chart re-rendered on every parent state change (socket events, unrelated state updates)
- Expensive palette and pie calculations ran on every render
- Tooltip hover caused full component re-renders
- Animation triggered unnecessarily

### After Optimization
- Chart only re-renders when actual chart data changes
- Expensive computations cached and reused
- Optional external hover prevents tooltip-related re-renders
- Animations only trigger when data values change
- Stable DOM structure reduces browser reflow/repaint

## Migration Guide

### For BudgetComponent (Current Usage)
No changes required. The optimized component maintains full backward compatibility.

### For New Components
Consider using external hover state management for optimal performance:

1. Move hover state to parent component
2. Memoize callback functions with `useCallback`
3. Memoize data transformations with `useMemo`

## Testing

Run the optimization tests:

```bash
npm test VisxPieChart.optimization.test.tsx
```

View the demo component to see performance benefits:

```tsx
import VisxPieChartDemo from './VisxPieChartDemo';
```

## Technical Details

- **React.memo comparator**: Shallow comparison of all relevant props
- **usePrevious hook**: Tracks previous arc data to detect actual changes
- **Memoization dependencies**: Carefully tuned to balance performance and correctness
- **Key stability**: Uses `${name}-${value}` for consistent element keys
- **Animation control**: Separates hover effects from data change animations

The optimizations maintain the exact same visual behavior while significantly improving performance in high-frequency update scenarios.