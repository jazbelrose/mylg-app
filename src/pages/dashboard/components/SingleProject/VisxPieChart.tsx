import React, { memo } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { animated, useSpring, to } from "@react-spring/web";
import { formatUSD } from "../../../../utils/budgetUtils";
import {
  CHART_COLORS,
  generateSequentialPalette,
  getColor,
} from "../../../../utils/colorUtils";

const EXPLODE_PX = 8;

/* ── Types ───────────────────────────────────────────── */

export type Datum = { name: string; value: number };

export type VisxPieChartProps = {
  data: Datum[];
  total: number;
  formatTooltip?: (d: Datum) => string;
  donutRatio?: number; // 0..1
  colors?: string[];
  baseColor?: string;
  colorMode?: "sequential" | "categorical";
  projectId?: string;
};

// Minimal visx arc/context typings (keeps us independent of deep visx generics)
type PieArcDatum<D> = {
  data: D;
  startAngle: number;
  endAngle: number;
  padAngle: number;
  value: number;
};

type PieRenderContext<D> = {
  arcs: Array<PieArcDatum<D>>;
  path: (a: PieArcDatum<D>) => string;
};

/* ── Animated Arc ────────────────────────────────────── */

type AnimatedArcProps = {
  arc: PieArcDatum<Datum>;
  pie: PieRenderContext<Datum>;
  color: string;
  showTooltip: (args: {
    tooltipData: Datum;
    tooltipLeft: number;
    tooltipTop: number;
  }) => void;
  hideTooltip: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  clampTooltip: (
    x: number,
    y: number,
    tooltipWidth?: number,
    tooltipHeight?: number
  ) => { left: number; top: number };
  rafRef: React.MutableRefObject<number | null>;
  explodePx?: number;
};

function AnimatedArc({
  arc,
  pie,
  color,
  showTooltip,
  hideTooltip,
  containerRef,
  clampTooltip,
  rafRef,
  explodePx = EXPLODE_PX,
}: AnimatedArcProps) {
  const [springs, api] = useSpring(() => ({
    startAngle: 0,
    endAngle: 0,
    x: 0,
    y: 0,
  }));

  React.useEffect(() => {
    api.start({ startAngle: arc.startAngle, endAngle: arc.endAngle });
  }, [arc.startAngle, arc.endAngle, api]);

  const pathD = to(
    [springs.startAngle, springs.endAngle],
    (startAngle, endAngle) => pie.path({ ...arc, startAngle, endAngle })
  );

  const [cx, cy] = React.useMemo(() => {
    // Use the static path (no animation) to compute centroid
    const tempPath = pie.path(arc);
    // Rough centroid from arc mid-angle; simpler/more stable than parsing path
    const mid = (arc.startAngle + arc.endAngle) / 2;
    const R = 1; // unit vector; we'll normalize below anyway
    return [Math.cos(mid) * R, Math.sin(mid) * R];
  }, [pie, arc]);

  const len = Math.max(1, Math.hypot(cx, cy));
  const translate = to([springs.x, springs.y], (x, y) => `translate(${x}, ${y})`);
  const isSingle = pie.arcs.length === 1;

  // Cleanup any queued RAF when arc unmounts
  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [rafRef]);

  const show = (evt: React.MouseEvent<SVGGElement>) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const point = localPoint(evt) || { x: 0, y: 0 };
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = rect.left + point.x;
        const screenY = rect.top + point.y;
        const { left, top } = clampTooltip(screenX, screenY);
        showTooltip({
          tooltipData: arc.data,
          tooltipLeft: left,
          tooltipTop: top,
        });
      }
    });
  };

  const reset = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    api.start(isSingle
      ? { startAngle: arc.startAngle, endAngle: arc.endAngle }
      : { x: 0, y: 0 });
    hideTooltip();
  };

  const explode = () => {
    if (isSingle) {
      api.start({
        startAngle: arc.startAngle - 0.01,
        endAngle: arc.endAngle + 0.01,
      });
    } else {
      api.start({ x: (cx / len) * explodePx, y: (cy / len) * explodePx });
    }
  };

  return (
    <animated.g
      transform={translate}
      onMouseEnter={explode}
      onMouseMove={show}
      onMouseLeave={reset}
      onFocus={explode}
      onBlur={reset}
      tabIndex={0}
      role="button"
      aria-label={`${arc.data.name}: ${arc.data.value}`}
      style={{ cursor: "pointer" }}
    >
      <animated.path
        d={pathD as unknown as string}
        fill={color}
        stroke="none"
        shapeRendering="geometricPrecision"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeMiterlimit={2}
      >
        <title>{arc.data.name}</title>
      </animated.path>
    </animated.g>
  );
}

/* ── Chart ───────────────────────────────────────────── */

function VisxPieChart({
  data,
  total,
  formatTooltip = (d) => `${d.name}: ${formatUSD(d.value)}`,
  donutRatio = 0.6,
  colors,
  baseColor,
  colorMode = "sequential",
  projectId,
}: VisxPieChartProps) {
  const projectBase = baseColor || (projectId ? getColor(projectId) : "#3b82f6");

  const palette = React.useMemo(() => {
    if (colors && colors.length) return colors;
    if (colorMode === "categorical") {
      return data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
    }
    // Reverse so largest value tends to be darkest.
    return generateSequentialPalette(projectBase, data.length).reverse();
  }, [colors, colorMode, projectBase, data.length]);

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Tooltip state/portal
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    showTooltip,
    hideTooltip,
  } = useTooltip<Datum>();
  const { TooltipInPortal } = useTooltipInPortal({ scroll: true, containerRef });

  const rafRef = React.useRef<number | null>(null);

  // Clamp tooltip to viewport
  const clampTooltip = React.useCallback(
    (x: number, y: number, tooltipWidth = 160, tooltipHeight = 40) => {
      const offset = 8;
      const vw = typeof window !== "undefined" ? window.innerWidth : tooltipWidth;
      const vh = typeof window !== "undefined" ? window.innerHeight : tooltipHeight;
      let left = x + offset;
      let top = y + offset;
      if (left + tooltipWidth > vw) left = x - tooltipWidth - offset;
      if (top + tooltipHeight > vh) top = y - tooltipHeight - offset;
      left = Math.max(0, left);
      top = Math.max(0, top);
      return { left, top };
    },
    []
  );

  // Cleanup RAF if parent unmounts
  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <ParentSize>
      {({ width, height }) => {
        const isSingle = data.length === 1;
        const radius = Math.floor(Math.min(width, height) / 2);
        const outerRadius = Math.max(0, radius - EXPLODE_PX);
        const innerRadius = Math.max(0, Math.round(outerRadius * donutRatio));

        return (
          <div
            ref={containerRef}
            style={{ position: "relative", width, height }}
            aria-label="Budget distribution"
            role="img"
          >
            <svg width={width} height={height}>
              <Group top={height / 2} left={width / 2}>
                <Pie<Datum>
                  data={data}
                  pieValue={(d) => d.value}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  padAngle={isSingle ? 0 : 0.004}
                  pieSortValues={
                    colorMode === "sequential" ? (a, b) => b - a : undefined
                  }
                >
                  {(pie) =>
                    pie.arcs.map((arc, i) => (
                      <AnimatedArc
                        key={`${arc.data.name}-${i}`}
                        arc={arc as unknown as PieArcDatum<Datum>}
                        pie={{
                          arcs: pie.arcs as unknown as Array<PieArcDatum<Datum>>,
                          path: pie.path as (a: PieArcDatum<Datum>) => string,
                        }}
                        color={palette[i % palette.length]}
                        showTooltip={showTooltip}
                        hideTooltip={hideTooltip}
                        containerRef={containerRef}
                        clampTooltip={clampTooltip}
                        rafRef={rafRef}
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
                aria-label={`Total ${formatUSD(total)}`}
              >
                {formatUSD(total)}
              </text>
            </svg>

            {tooltipOpen && tooltipData && (
              <TooltipInPortal
                top={tooltipTop}
                left={tooltipLeft}
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

/* ── Memo: smarter shallow compare ───────────────────── */

function shallowEqualData(a: Datum[], b: Datum[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const A = a[i];
    const B = b[i];
    if (A.name !== B.name || A.value !== B.value) return false;
  }
  return true;
}

export default memo(
  VisxPieChart,
  (prev, next) =>
    prev.total === next.total &&
    shallowEqualData(prev.data, next.data) &&
    prev.baseColor === next.baseColor &&
    prev.donutRatio === next.donutRatio &&
    prev.colorMode === next.colorMode &&
    prev.projectId === next.projectId &&
    // palettes are typically stable by ref; if caller passes new array each render,
    // you can remove this line to always recompute
    prev.colors === next.colors
);
