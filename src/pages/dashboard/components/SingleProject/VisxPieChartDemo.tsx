import React, { useState, useCallback } from 'react';
import VisxPieChart from './VisxPieChart';

// Demo component to show the optimization benefits
const VisxPieChartDemo = () => {
  const [data] = useState([
    { name: 'Category A', value: 100 },
    { name: 'Category B', value: 200 },
    { name: 'Category C', value: 150 },
  ]);
  
  const [total] = useState(450);
  const [unrelatedCounter, setUnrelatedCounter] = useState(0);
  const [hoveredSlice, setHoveredSlice] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // This function will be called frequently but shouldn't cause chart re-renders
  const incrementCounter = () => {
    setUnrelatedCounter(prev => prev + 1);
  };

  // External hover state management
  const handleSliceHover = useCallback((slice: any, event?: { x: number; y: number }) => {
    setHoveredSlice(slice);
    if (event) {
      setTooltipPosition({ x: event.x, y: event.y });
    }
  }, []);

  const formatTooltip = useCallback((d: any) => {
    return `${d.name}: $${d.value.toFixed(2)}`;
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>VisxPieChart Optimization Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={incrementCounter}>
          Increment Unrelated Counter: {unrelatedCounter}
        </button>
        <p>
          This button triggers parent re-renders but the chart below should NOT re-render
          thanks to React.memo optimization.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '40px' }}>
        {/* Chart with internal hover state (backward compatible) */}
        <div>
          <h3>Internal Hover State (Default)</h3>
          <div style={{ width: '300px', height: '300px', border: '1px solid #ccc' }}>
            <VisxPieChart
              data={data}
              total={total}
              formatTooltip={formatTooltip}
              colorMode="sequential"
            />
          </div>
        </div>

        {/* Chart with external hover state (optimal performance) */}
        <div>
          <h3>External Hover State (Optimal)</h3>
          <div style={{ width: '300px', height: '300px', border: '1px solid #ccc' }}>
            <VisxPieChart
              data={data}
              total={total}
              formatTooltip={formatTooltip}
              colorMode="sequential"
              onSliceHover={handleSliceHover}
              hoveredSlice={hoveredSlice}
            />
          </div>
          {hoveredSlice && (
            <div 
              style={{
                position: 'fixed',
                left: tooltipPosition.x + 10,
                top: tooltipPosition.y - 30,
                background: 'rgba(0,0,0,0.9)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              {formatTooltip(hoveredSlice)}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Optimization Benefits:</h3>
        <ul>
          <li>✅ React.memo prevents re-renders when unrelated props change</li>
          <li>✅ Memoized computations (palette, pie calculations) avoid expensive recalculations</li>
          <li>✅ Optional external hover state prevents tooltip-related re-renders</li>
          <li>✅ Stable keys prevent unnecessary DOM updates</li>
          <li>✅ Animation only triggers on actual data changes</li>
        </ul>
      </div>
    </div>
  );
};

export default VisxPieChartDemo;