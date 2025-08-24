import React, { memo, useMemo, useRef } from "react";
import { Pie } from "@visx/shape";
import type { ProvidedProps, PieArcDatum } from "@visx/shape/lib/types";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { animated, useSpring, to as springTo, SpringValue } from "@react-spring/web";
import { formatUSD } from "../../../../utils/budgetUtils";
import {
  CHART_COLORS,
  generateSequentialPalette,
  getColor,
} from "../../../../utils/colorUtils";
import { useData } from "../../../../app/contexts/DataProvider";

// Custom hook to track previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// Shallow comparison utility for props
function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;
  if (typeof obj1 !== "object" || typeof obj2 !== "object") return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

// Custom comparator for React.memo
function arePropsEqual(prevProps: VisxPieChartProps, nextProps: VisxPieChartProps): boolean {
  return (
    prevProps.total === nextProps.total &&
    shallowEqual(prevProps.data, nextProps.data) &&
    shallowEqual(prevProps.colors, nextProps.colors) &&
    prevProps.formatTooltip === nextProps.formatTooltip &&
    prevProps.donutRatio === nextProps.donutRatio &&
    prevProps.baseColor === nextProps.baseColor &&
    prevProps.colorMode === nextProps.colorMode &&
    prevProps.projectId === nextProps.projectId &&
    prevProps.onSliceHover === nextProps.onSliceHover &&
    prevProps.hoveredSlice === nextProps.hoveredSlice
  );
}

const EXPLODE_PX = 8;

export type PieDatum = {
  name: string;
  value: number;
  // Allow extra fields if callers pass richer objects
  [key: string]: unknown;
};

type ClampResult = { left: number; top: number };

interface AnimatedArcProps {
  arc: PieArcDatum<PieDatum>;
  pie: ProvidedProps<PieDatum>;
  color: string;
  onSliceHover?: (slice: PieDatum | null, event?: { x: number; y: number }) => void;
  hoveredSlice?: PieDatum | null;
  containerRef: React.RefObject<HTMLDivElement>;
  explodePx?: number;
}

function AnimatedArc({
  arc,
  pie,
  color,
  onSliceHover,
  hoveredSlice,
  containerRef,
  explodePx = EXPLODE_PX,
}: AnimatedArcProps) {
  const [springs, api] = useSpring(() => ({
    startAngle: arc.startAngle,
    endAngle: arc.endAngle,
    x: 0,
    y: 0,
  }));

  // Get previous arc data to detect changes
  const prevArc = usePrevious(arc);
  
  // Only animate when arc data actually changes
  React.useEffect(() => {
    if (prevArc && (
      prevArc.startAngle !== arc.startAngle ||
      prevArc.endAngle !== arc.endAngle ||
      prevArc.value !== arc.value
    )) {
      api.start({ 
        startAngle: arc.startAngle, 
        endAngle: arc.endAngle 
      });
    }
  }, [arc, prevArc, api]);

  // Check if this slice is currently hovered
  const isHovered = hoveredSlice && hoveredSlice.name === arc.data.name;

  const pathD: SpringValue<string> = springTo(
    [springs.startAngle as SpringValue<number>, springs.endAngle as SpringValue<number>],
    (startAngle, endAngle) => pie.path({ ...arc, startAngle, endAngle })
  );

  const [cx, cy] = React.useMemo(() => pie.path.centroid(arc), [pie, arc]);
  const len = Math.max(1, Math.hypot(cx, cy));
  const translate = springTo(
    [springs.x as SpringValue<number>, springs.y as SpringValue<number>],
    (x, y) => `translate(${x}, ${y})`
  );
  const isSingle = pie.arcs.length === 1;

  // Handle hover animation effect
  React.useEffect(() => {
    if (isHovered) {
      if (isSingle) {
        api.start({
          startAngle: arc.startAngle - 0.01,
          endAngle: arc.endAngle + 0.01,
        });
      } else {
        api.start({ x: (cx / len) * explodePx, y: (cy / len) * explodePx });
      }
    } else {
      api.start(
        isSingle
          ? { startAngle: arc.startAngle, endAngle: arc.endAngle }
          : { x: 0, y: 0 }
      );
    }
  }, [isHovered, api, arc, cx, cy, len, explodePx, isSingle]);

  return (
    <animated.g
      transform={translate}
      onMouseEnter={(e) => {
        if (onSliceHover) {
          const rect = containerRef.current?.getBoundingClientRect();
          const pt = localPoint(e) || { x: 0, y: 0 };
          const screenX = rect ? rect.left + pt.x : pt.x;
          const screenY = rect ? rect.top + pt.y : pt.y;
          onSliceHover(arc.data, { x: screenX, y: screenY });
        }
      }}
      onMouseMove={(e) => {
        if (onSliceHover && isHovered) {
          const rect = containerRef.current?.getBoundingClientRect();
          const pt = localPoint(e) || { x: 0, y: 0 };
          const screenX = rect ? rect.left + pt.x : pt.x;
          const screenY = rect ? rect.top + pt.y : pt.y;
          onSliceHover(arc.data, { x: screenX, y: screenY });
        }
      }}
      onMouseLeave={() => {
        if (onSliceHover) {
          onSliceHover(null);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <animated.path
        d={pathD}
        fill={color}
        stroke="none"
        shapeRendering="geometricPrecision"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeMiterlimit={2}
      >
        <title>{String(arc.data.name)}</title>
      </animated.path>
    </animated.g>
  );
}

export interface VisxPieChartProps {
  data: PieDatum[];
  total: number;
  formatTooltip?: (d: PieDatum) => React.ReactNode;
  donutRatio?: number; // 0..1
  colors?: string[];
  baseColor?: string;
  colorMode?: "sequential" | "categorical";
  projectId?: string;
  // External hover state management
  onSliceHover?: (slice: PieDatum | null, event?: { x: number; y: number }) => void;
  hoveredSlice?: PieDatum | null;
}

// Generic pie/donut chart rendered with visx. Used by budget components and header summaries.
function VisxPieChart({
  data,
  total,
  formatTooltip = (d) => `${d.name}: ${formatUSD(d.value)}`,
  donutRatio = 0.6,
  colors,
  baseColor,
  colorMode = "sequential",
  projectId,
  onSliceHover,
  hoveredSlice,
}: VisxPieChartProps) {
  const { activeProject } = useData();
  const projectBase =
    baseColor ||
    activeProject?.color ||
    (projectId ? getColor(projectId) : "#3b82f6");

  // Memoize expensive palette computation
  const palette = useMemo<string[]>(() => {
    if (colors && colors.length) return colors;
    if (colorMode === "categorical") {
      return data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
    }
    // For sequential palettes, ensure the darkest color corresponds to the largest value.
    return generateSequentialPalette(projectBase, data.length).reverse();
  }, [colors, colorMode, projectBase, data.length]); // Use data.length instead of data reference

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Memoize pie computations - only recalculate when data or donutRatio changes
  const pieComputations = useMemo(() => {
    return {
      isSingle: data.length === 1,
      sortedData: colorMode === "sequential" ? [...data].sort((a, b) => b.value - a.value) : data,
    };
  }, [data, colorMode]);

  // Internal tooltip state for backward compatibility when external hover is not provided
  const internalTooltip = useTooltip<PieDatum>();
  const { TooltipInPortal } = useTooltipInPortal({
    scroll: true,
    containerRef,
  });

  // Use external hover state if provided, otherwise fall back to internal tooltip
  const isUsingExternalHover = onSliceHover && hoveredSlice !== undefined;
  const tooltipData = isUsingExternalHover ? hoveredSlice : internalTooltip.tooltipData;
  const showingTooltip = isUsingExternalHover ? !!hoveredSlice : internalTooltip.tooltipOpen;

  // Clamp tooltip to viewport (only used with internal tooltip)
  const clampTooltip = React.useCallback((
    x: number,
    y: number,
    tooltipWidth = 160,
    tooltipHeight = 40
  ): ClampResult => {
    const offset = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + offset;
    let top = y + offset;
    if (left + tooltipWidth > vw) left = x - tooltipWidth - offset;
    if (top + tooltipHeight > vh) top = y - tooltipHeight - offset;
    left = Math.max(0, left);
    top = Math.max(0, top);
    return { left, top };
  }, []);

  // Handle internal hover when external hover is not provided
  const handleInternalHover = React.useCallback((slice: PieDatum | null, event?: { x: number; y: number }) => {
    if (slice && event) {
      const { left, top } = clampTooltip(event.x, event.y);
      internalTooltip.showTooltip({
        tooltipData: slice,
        tooltipLeft: left,
        tooltipTop: top,
      });
    } else {
      internalTooltip.hideTooltip();
    }
  }, [clampTooltip, internalTooltip]);

  return (
    <ParentSize>
      {({ width, height }: { width: number; height: number }) => {
        const radius = Math.floor(Math.min(width, height) / 2);
        const outerRadius = Math.max(0, radius - EXPLODE_PX);
        const innerRadius = Math.round(outerRadius * donutRatio);

        return (
          <div
            ref={containerRef}
            style={{
              position: "relative",
              width,
              height,
            }}
          >
            <svg width={width} height={height}>
              <Group top={height / 2} left={width / 2}>
                <Pie<PieDatum>
                  data={pieComputations.sortedData}
                  pieValue={(d) => d.value}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  padAngle={pieComputations.isSingle ? 0 : 0.004}
                  pieSortValues={colorMode === "sequential" ? (a, b) => b - a : undefined}
                >
                  {(pieProps: ProvidedProps<PieDatum>) =>
                    pieProps.arcs.map((arc, i) => (
                      <AnimatedArc
                        key={`${String(arc.data.name)}-${arc.data.value}`} // Stable key using name and value
                        arc={arc}
                        pie={pieProps}
                        color={palette[i % palette.length]}
                        onSliceHover={isUsingExternalHover ? onSliceHover : handleInternalHover}
                        hoveredSlice={hoveredSlice}
                        containerRef={containerRef}
                        explodePx={EXPLODE_PX}
                      />
                    ))
                  }
                </Pie>
              </Group>
              <text
                x={width / 2}
                y={height / 2}
                dy={4}
                textAnchor="middle"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fill: "#fff",
                  stroke: "rgba(0,0,0,0.7)",
                  strokeWidth: 0.5,
                  paintOrder: "stroke",
                }}
              >
                {formatUSD(total)}
              </text>
            </svg>

            {!isUsingExternalHover && showingTooltip && tooltipData && (
              <TooltipInPortal
                top={internalTooltip.tooltipTop || 0}
                left={internalTooltip.tooltipLeft || 0}
                style={{
                  position: "fixed",
                  zIndex: 9999,
                  pointerEvents: "none",
                  background: "rgba(0,0,0,0.9)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  boxShadow: "0 2px 12px 0 rgba(0,0,0,0.18)",
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  minWidth: 60,
                  maxWidth: 320,
                  wordBreak: "break-word",
                }}
              >
                {formatTooltip(tooltipData)}
              </TooltipInPortal>
            )}
          </div>
        );
      }}
    </ParentSize>
  );
}

// Export the memoized component
export default memo(VisxPieChart, arePropsEqual);
