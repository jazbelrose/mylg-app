import React from 'react';
import { ParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Group } from '@visx/group';
import { CHART_COLORS } from '../../../../utils/colorUtils';
import { formatUSD } from '../../../../utils/budgetUtils';

export interface BudgetChartDatum {
  category: string;
  amount: number;
}

interface BudgetChartProps {
  data: BudgetChartDatum[];
}

const BudgetChart: React.FC<BudgetChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: '200px', marginTop: '20px' }}>
      <ParentSize>
        {({ width, height }) => {
          const margin = { top: 20, right: 30, bottom: 20, left: 40 };
          const xMax = width - margin.left - margin.right;
          const yMax = height - margin.top - margin.bottom;
          const xScale = scaleBand<string>({
            range: [0, xMax],
            domain: data.map(d => d.category),
            padding: 0.4,
          });
          const max = Math.max(...data.map(d => d.amount), 0);
          const yScale = scaleLinear<number>({ range: [yMax, 0], domain: [0, max] });
          return (
            <svg width={width} height={height}>
              <Group left={margin.left} top={margin.top}>
                {data.map(d => {
                  const x = xScale(d.category) ?? 0;
                  const y = yScale(d.amount);
                  const barHeight = yMax - y;
                  return (
                    <Bar
                      key={d.category}
                      x={x}
                      y={y}
                      width={xScale.bandwidth()}
                      height={barHeight}
                      fill={CHART_COLORS[0]}
                    />
                  );
                })}
                <AxisBottom
                  top={yMax}
                  scale={xScale}
                  tickLabelProps={() => ({ fontSize: 12, textAnchor: 'middle' })}
                />
                <AxisLeft scale={yScale} tickFormat={value => formatUSD(Number(value))} />
              </Group>
            </svg>
          );
        }}
      </ParentSize>
    </div>
  );
};

export default BudgetChart;
