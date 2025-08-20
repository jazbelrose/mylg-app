import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { animated, useSpring, to } from "@react-spring/web";
import { formatUSD } from "../../../../utils/budgetUtils";
import { CHART_COLORS, generateSequentialPalette, getColor, } from "../../../../utils/colorUtils";
import { useData } from "../../../../app/contexts/DataProvider";
const EXPLODE_PX = 12;
function AnimatedArc({ arc, pie, color, showTooltip, hideTooltip, containerRef, clampTooltip, rafRef, explodePx = 8, dataVersion }) {
    const [springs, api] = useSpring(() => ({
        startAngle: 0,
        endAngle: 0,
        x: 0,
        y: 0,
        config: { tension: 300, friction: 30 }
    }));
    React.useEffect(() => {
        api.start({ startAngle: arc.startAngle, endAngle: arc.endAngle });
    }, [arc.startAngle, arc.endAngle, api, dataVersion]);
    const pathD = to([springs.startAngle, springs.endAngle], (startAngle, endAngle) => pie.path({ ...arc, startAngle, endAngle }));
    const [cx, cy] = React.useMemo(() => pie.path.centroid(arc), [pie, arc]);
    const len = Math.max(1, Math.hypot(cx, cy));
    const translate = to([springs.x, springs.y], (x, y) => `translate(${x}, ${y})`);
    const isSingle = pie.arcs.length === 1;
    return (_jsx(animated.g, { transform: translate, onMouseEnter: () => {
            if (isSingle) {
                api.start({
                    startAngle: arc.startAngle - 0.01,
                    endAngle: arc.endAngle + 0.01,
                });
            }
            else {
                api.start({ x: (cx / len) * explodePx, y: (cy / len) * explodePx });
            }
        }, onMouseMove: (e) => {
            if (rafRef.current)
                cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                const point = localPoint(e) || { x: 0, y: 0 };
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
        }, onMouseLeave: () => {
            if (rafRef.current)
                cancelAnimationFrame(rafRef.current);
            api.start(isSingle
                ? { startAngle: arc.startAngle, endAngle: arc.endAngle }
                : { x: 0, y: 0 });
            hideTooltip();
        }, style: { cursor: 'pointer' }, children: _jsx(animated.path, { d: pathD, fill: color, stroke: "none", shapeRendering: "geometricPrecision", vectorEffect: "non-scaling-stroke", strokeLinejoin: "round", strokeMiterlimit: 2, children: _jsx("title", { children: arc.data.name }) }) }));
}
// Generic pie/donut chart rendered with visx. Used by budget components
// and header summaries.
export default function VisxPieChart({ data, total, formatTooltip = (d) => `${d.name}: ${formatUSD(d.value)}`, donutRatio = 0.6, colors, baseColor, colorMode = "sequential", projectId, }) {
    const { activeProject } = useData();
    const projectBase = baseColor ||
        activeProject?.color ||
        (projectId ? getColor(projectId) : "#3b82f6");
    
    // Create a version string based on data to force re-animations when data changes
    const dataVersion = React.useMemo(() => {
        return data.map(d => `${d.name}:${d.value}`).join('-');
    }, [data]);
    const palette = React.useMemo(() => {
        if (colors && colors.length)
            return colors;
        if (colorMode === "categorical") {
            return data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
        }
        // For sequential palettes, ensure the darkest color corresponds to the
        // largest value by reversing the generated range (dark -> light).
        return generateSequentialPalette(projectBase, data.length).reverse();
    }, [colors, colorMode, projectBase, data]);
    const containerRef = React.useRef(null);
    // useTooltip for state/handlers
    const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip, } = useTooltip();
    // useTooltipInPortal for portal rendering
    const { TooltipInPortal } = useTooltipInPortal({ scroll: true, containerRef });
    // Throttle mouse move with requestAnimationFrame
    const rafRef = React.useRef();
    // No need for containerRect effect
    // Clamp tooltip to viewport
    function clampTooltip(x, y, tooltipWidth = 160, tooltipHeight = 40) {
        const offset = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let left = x + offset;
        let top = y + offset;
        if (left + tooltipWidth > vw)
            left = x - tooltipWidth - offset;
        if (top + tooltipHeight > vh)
            top = y - tooltipHeight - offset;
        left = Math.max(0, left);
        top = Math.max(0, top);
        return { left, top };
    }
    return (_jsx(ParentSize, { children: ({ width, height }) => {
            const isSingle = data.length === 1;
            const radius = Math.floor(Math.min(width, height) / 2);
            const outerRadius = radius - EXPLODE_PX;
            const innerRadius = Math.round(outerRadius * donutRatio);
            return (_jsxs("div", { ref: containerRef, style: {
                    position: "relative",
                    width,
                    height,
                }, children: [_jsxs("svg", { width: width, height: height, children: [_jsx(Group, { top: height / 2, left: width / 2, children: _jsx(Pie, { data: data, pieValue: (d) => d.value, innerRadius: innerRadius, outerRadius: outerRadius, padAngle: isSingle ? 0 : 0.004, pieSortValues: colorMode === "sequential" ? (a, b) => b - a : undefined, children: (pie) => pie.arcs.map((arc, i) => (_jsx(AnimatedArc, { arc: arc, pie: pie, color: palette[i % palette.length], showTooltip: showTooltip, hideTooltip: hideTooltip, containerRef: containerRef, clampTooltip: clampTooltip, rafRef: rafRef, explodePx: EXPLODE_PX, dataVersion: dataVersion }, `${arc.data.name}-${dataVersion}`))) }) }), _jsx("text", { x: width / 2, y: height / 2, dy: 4, textAnchor: "middle", style: {
                                    fontSize: 16,
                                    fontWeight: 700,
                                    fill: "#fff",
                                    stroke: "rgba(0,0,0,0.7)",
                                    strokeWidth: 0.5,
                                    paintOrder: "stroke",
                                }, children: formatUSD(total) })] }), tooltipOpen && tooltipData && (_jsx(TooltipInPortal, { top: tooltipTop, left: tooltipLeft, style: {
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
                        }, children: formatTooltip(tooltipData) }))] }));
        } }));
}
