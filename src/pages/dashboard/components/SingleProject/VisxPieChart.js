import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { formatUSD } from "../../../../utils/budgetUtils";
import {
  CHART_COLORS,
  generateSequentialPalette,
  getColor,
} from "../../../../utils/colorUtils";
import { useData } from "../../../../app/contexts/DataProvider";

// Simple non-animated slice
function ArcSlice({ arc, pie, color, showTooltip, hideTooltip, containerRef, clampTooltip }) {
  return _jsxs("g", {
    onMouseEnter: (e) => {
      const point = localPoint(e) || { x: 0, y: 0 };
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = rect.left + point.x;
        const screenY = rect.top + point.y;
        const { left, top } = clampTooltip(screenX, screenY);
        showTooltip({ tooltipData: arc.data, tooltipLeft: left, tooltipTop: top });
      }
    },
    onMouseMove: (e) => {
      const point = localPoint(e) || { x: 0, y: 0 };
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = rect.left + point.x;
        const screenY = rect.top + point.y;
        const { left, top } = clampTooltip(screenX, screenY);
        showTooltip({ tooltipData: arc.data, tooltipLeft: left, tooltipTop: top });
      }
    },
    onMouseLeave: hideTooltip,
    style: { cursor: "default" },
    children: [
      _jsxs("path", {
        d: pie.path(arc),
        fill: color,
        stroke: "none",
        shapeRendering: "geometricPrecision",
        vectorEffect: "non-scaling-stroke",
        strokeLinejoin: "round",
        strokeMiterlimit: 2,
        children: [_jsx("title", { children: arc.data.name })]
      })
    ]
  });
}

// Generic pie/donut chart rendered with visx.
export default function VisxPieChart({
  data,
  total,
  formatTooltip = (d) => `${d.name}: ${formatUSD(d.value)}`,
  donutRatio = 0.6,
  colors,
  baseColor,
  colorMode = "sequential",
  projectId,
}) {
  const { activeProject } = useData();

  const projectBase =
    baseColor ||
    (activeProject && activeProject.color) ||
    (projectId ? getColor(projectId) : "#3b82f6");

  const palette = React.useMemo(() => {
    if (colors && colors.length) return colors;
    if (colorMode === "categorical") {
      return data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
    }
    return generateSequentialPalette(projectBase, data.length).reverse();
  }, [colors, colorMode, projectBase, data]);

  const containerRef = React.useRef(null);

  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    showTooltip,
    hideTooltip,
  } = useTooltip();

  const { TooltipInPortal } = useTooltipInPortal({
    scroll: true,
    containerRef,
  });

  function clampTooltip(x, y, tooltipWidth = 160, tooltipHeight = 40) {
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
  }

  return _jsx(ParentSize, {
    children: ({ width, height }) => {
      const isSingle = data.length === 1;
      const radius = Math.floor(Math.min(width, height) / 2);
      const outerRadius = radius; // no explode margin
      const innerRadius = Math.round(outerRadius * donutRatio);

      return _jsxs("div", {
        ref: containerRef,
        style: { position: "relative", width, height },
        children: [
          _jsxs("svg", {
            width: width,
            height: height,
            children: [
              _jsx(Group, {
                top: height / 2,
                left: width / 2,
                children: _jsx(Pie, {
                  data: data,
                  pieValue: (d) => d.value,
                  innerRadius: innerRadius,
                  outerRadius: outerRadius,
                  padAngle: isSingle ? 0 : 0.004,
                  pieSortValues: colorMode === "sequential" ? (a, b) => b - a : undefined,
                  children: (pie) =>
                    pie.arcs.map((arc, i) =>
                      _jsx(ArcSlice, {
                        arc,
                        pie,
                        color: palette[i % palette.length],
                        showTooltip,
                        hideTooltip,
                        containerRef,
                        clampTooltip,
                      }, arc.data.name)
                    )
                })
              }),
              _jsx("text", {
                x: width / 2,
                y: height / 2,
                dy: 4,
                textAnchor: "middle",
                style: {
                  fontSize: 16,
                  fontWeight: 700,
                  fill: "#fff",
                  stroke: "rgba(0,0,0,0.7)",
                  strokeWidth: 0.5,
                  paintOrder: "stroke",
                },
                children: formatUSD(total)
              })
            ]
          }),
          (tooltipOpen && tooltipData) &&
            _jsx(TooltipInPortal, {
              top: tooltipTop,
              left: tooltipLeft,
              style: {
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
              },
              children: formatTooltip(tooltipData)
            })
        ]
      });
    }
  });
}
