import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { scaleLinear, scaleBand, scaleTime } from '@visx/scale';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { AxisBottom, AxisTop } from '@visx/axis';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { ParentSize } from '@visx/responsive';
import { Zoom } from '@visx/zoom';
const PX_PER_HOUR = 0;
// 1. Level of Detail (LOD) thresholds by zoom
function getLOD(pxPerDay) {
    if (pxPerDay < 6)
        return 0; // dots only
    if (pxPerDay < 20)
        return 1; // tiny unlabeled pills
    return 2; // full labeled clips
}
// 2. Safe text fitter (SVG-safe)
function fitText(s, maxW, charW = 6.8) {
    const maxChars = Math.floor(maxW / charW);
    if (maxChars <= 3)
        return "";
    return s.length <= maxChars ? s : s.slice(0, maxChars - 1) + "…";
}
// 3. Clip renderer
function TaskClip({ x, y, w, h, color, label, lod }) {
    const r = Math.min(6, h / 2);
    if (lod === 0) {
        return (_jsxs("g", { transform: `translate(${x},${y})`, children: [_jsx("line", { x1: 0, y1: 0, x2: 0, y2: h, stroke: color, strokeWidth: 2 }), _jsx("circle", { cx: 0, cy: h / 2, r: 3, fill: color })] }));
    }
    if (lod === 1) {
        return (_jsxs("g", { children: [_jsx("rect", { x: x, y: y, width: Math.max(6, w), height: h, rx: r, fill: color, opacity: 0.9 }), _jsx("rect", { x: x + 2, y: y + 2, width: 2, height: h - 4, fill: "rgba(0,0,0,0.35)" })] }));
    }
    const padding = 8;
    const maxTextWidth = Math.max(0, w - padding * 2);
    const fitted = fitText(label, maxTextWidth);
    return (_jsxs("g", { children: [_jsx("rect", { x: x, y: y, width: w, height: h, rx: r, fill: color }), maxTextWidth > 30 && (_jsx("text", { x: x + padding, y: y + h / 2 + 4, fontSize: 12, fontWeight: 600, fill: "#fff", children: fitted }))] }));
}
function safeParse(dateStr) {
    if (!dateStr)
        return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    const parsed = new Date(dateStr);
    return !Number.isNaN(parsed.getTime())
        ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
        : null;
}
const tooltipStyles = {
    backgroundColor: '#0c0c0c',
    borderRadius: '8px',
    border: '1px solid #FA3356',
    color: '#f4f4f4',
    padding: '8px',
};
const TimelineChart = ({ project, mode = 'overview', selectedDate: selectedDateProp, onModeChange, onDateChange, }) => {
    const events = useMemo(() => Array.isArray(project?.timelineEvents) ? project.timelineEvents : [], [project?.timelineEvents]);
    const firstDate = events.length > 0 ? events[0].date : new Date().toISOString().split('T')[0];
    const currentDate = selectedDateProp || firstDate;
    // Start date
    const startDate = useMemo(() => {
        const dates = events.map((e) => safeParse(e.date)).filter(Boolean);
        return dates.length > 0
            ? new Date(Math.min(...dates.map((d) => d.getTime())))
            : safeParse(project?.productionStart || project?.dateCreated) || new Date();
    }, [events, project?.productionStart, project?.dateCreated]);
    // Tracks for overview mode
    const tracks = useMemo(() => {
        const byTrack = {};
        events.forEach((ev) => {
            const track = (ev.phase || ev.type || ev.description || ev.date).toUpperCase();
            const start = safeParse(ev.date);
            if (!start)
                return;
            const durationHours = Number(ev.hours) || 1;
            const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
            if (!byTrack[track])
                byTrack[track] = [];
            byTrack[track].push({ ...ev, track, start, end, duration: durationHours });
        });
        return Object.entries(byTrack).map(([name, evts]) => ({ name, events: evts }));
    }, [events]);
    // Total hours span of all events
    const totalHours = useMemo(() => {
        return tracks.reduce((max, t) => t.events.reduce((innerMax, ev) => Math.max(innerMax, (ev.end - startDate) / 3_600_000), max), 0);
    }, [tracks, startDate]);
    const endDate = useMemo(() => new Date(startDate.getTime() + totalHours * 3_600_000), [
        startDate,
        totalHours,
    ]);
    // Agenda data
    const agendaData = useMemo(() => {
        if (!currentDate)
            return [];
        const dayEvents = events.filter((e) => e.date === currentDate);
        return dayEvents.map((ev, idx) => {
            const hours = Number(ev.hours) || 1;
            return {
                description: (ev.description || `Event ${idx + 1}`).toUpperCase(),
                start: Number(ev.start ?? ev.startHour ?? 0),
                duration: Math.max(hours, 1),
                rawHours: hours,
            };
        });
    }, [events, currentDate]);
    // Tooltip logic
    const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip, } = useTooltip();
    const handleMouseMove = (event, data) => {
        showTooltip({
            tooltipData: data,
            tooltipLeft: event.clientX,
            tooltipTop: event.clientY,
        });
    };
    // Overview chart (zoom/scrollable)
    const renderOverview = () => (_jsx(ParentSize, { children: ({ width: parentWidth }) => {
            const margin = { top: 10, right: 20, bottom: 20, left: 60 };
            // Dynamic track height: more tracks = smaller height, fewer tracks = larger height
            const minTrackHeight = 32;
            const maxTrackHeight = 60;
            const minChartHeight = 300;
            const trackCount = tracks.length;
            let trackHeight;
            if (trackCount <= 3) {
                trackHeight = maxTrackHeight;
            }
            else if (trackCount <= 8) {
                trackHeight = minTrackHeight + (maxTrackHeight - minTrackHeight) * (8 - trackCount) / 5;
            }
            else {
                trackHeight = minTrackHeight;
            }
            const contentHeight = Math.max(trackCount * trackHeight, minChartHeight);
            const contentWidth = Math.max(totalHours * PX_PER_HOUR, parentWidth || 900, 900);
            const svgWidth = margin.left + margin.right + contentWidth;
            const svgHeight = margin.top + margin.bottom + contentHeight;
            // Fit chart to viewport on load
            const fitScale = (parentWidth || 900) / contentWidth;
            const baseXScale = scaleTime({
                domain: [startDate, endDate],
                range: [0, contentWidth],
            });
            const eventDates = events.map((e) => safeParse(e.date)).filter(Boolean);
            const firstEventDate = eventDates.length
                ? new Date(Math.min(...eventDates.map((d) => d.getTime())))
                : null;
            const lastEventDate = eventDates.length
                ? new Date(Math.max(...eventDates.map((d) => d.getTime())))
                : null;
            const firstEventX = firstEventDate ? baseXScale(firstEventDate) : 0;
            const lastEventX = lastEventDate ? baseXScale(lastEventDate) : contentWidth;
            const yScale = scaleBand({
                domain: tracks.map((t) => t.name),
                range: [0, contentHeight],
                padding: 0.2,
            });
            const playheadDate = safeParse(currentDate);
            // Sticky track labels
            return (_jsxs("div", { style: { display: 'flex', position: 'relative', width: '100%' }, children: [_jsx("div", { style: {
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            background: '#181818',
                            minWidth: margin.left,
                            width: margin.left,
                            height: svgHeight,
                            borderRight: '1px solid #222',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            alignItems: 'flex-end',
                            paddingTop: margin.top,
                        }, children: tracks.map((t) => {
                            const y = yScale(t.name);
                            const h = yScale.bandwidth();
                            return (_jsx("div", { className: "track-label", style: {
                                    position: 'absolute',
                                    top: y + margin.top,
                                    right: 4,
                                    height: h,
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: '#fff',
                                    fontWeight: 500,
                                    fontSize: 12,
                                    lineHeight: 1.2,
                                    padding: '2px 4px',
                                    textShadow: '0 1px 2px #000',
                                    pointerEvents: 'none',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    maxWidth: '90%',
                                }, title: t.name, children: t.name.length > 18 ? t.name.slice(0, 16) + '…' : t.name }, t.name));
                        }) }), _jsx("div", { style: { overflowX: 'auto', flex: 1 }, children: _jsx(Zoom, { width: svgWidth, height: svgHeight, scaleXMin: fitScale, scaleXMax: 20, initialTransformMatrix: {
                                scaleX: fitScale,
                                scaleY: 1,
                                translateX: 0,
                                translateY: 0,
                                skewX: 0,
                                skewY: 0,
                            }, constrain: (transform) => {
                                // Prevent panning beyond the range of actual events
                                const scaledFirstX = firstEventX * transform.scaleX;
                                const scaledLastX = lastEventX * transform.scaleX;
                                const minX = Math.min(0, parentWidth - scaledLastX);
                                const maxX = -scaledFirstX;
                                return {
                                    ...transform,
                                    translateX: Math.max(minX, Math.min(transform.translateX, maxX)),
                                };
                            }, children: (zoom) => {
                                const xScale = (() => {
                                    const updated = baseXScale.copy();
                                    const transformedRange = baseXScale
                                        .range()
                                        .map((r) => zoom.applyToPoint({ x: r, y: 0 }).x);
                                    updated.range(transformedRange);
                                    return updated;
                                })();
                                // LOD calculation: px per day
                                const pxPerDay = xScale(new Date('2025-01-02')) - xScale(new Date('2025-01-01'));
                                const lod = getLOD(pxPerDay);
                                const playheadX = playheadDate ? xScale(playheadDate) : null;
                                return (_jsxs(_Fragment, { children: [_jsxs("svg", { width: svgWidth, height: svgHeight, style: {
                                                background: '#1a1a1a',
                                                cursor: zoom.isDragging ? 'grabbing' : 'grab',
                                            }, children: [_jsx("rect", { width: svgWidth, height: svgHeight, fill: "transparent", ref: zoom.containerRef, onWheel: zoom.handleWheel, onMouseDown: zoom.dragStart, onMouseMove: zoom.dragMove, onMouseUp: zoom.dragEnd, onMouseLeave: zoom.dragEnd }), _jsx(AxisTop, { top: margin.top, left: margin.left, scale: xScale, stroke: "#ccc", tickStroke: "#ccc", tickLabelProps: () => ({
                                                        fill: '#ccc',
                                                        fontSize: 12,
                                                        textAnchor: 'middle',
                                                    }) }), _jsxs(Group, { left: margin.left, top: margin.top, children: [tracks.map((t) => {
                                                            const y = yScale(t.name);
                                                            const h = yScale.bandwidth();
                                                            return (_jsx(Group, { top: y, children: t.events.map((ev, i) => {
                                                                    const x = xScale(ev.start);
                                                                    const w = Math.max(2, xScale(ev.end) - x);
                                                                    const label = ev.description || t.name;
                                                                    const startStr = ev.start.toLocaleDateString(undefined, {
                                                                        weekday: 'long',
                                                                        month: 'long',
                                                                        day: 'numeric',
                                                                    });
                                                                    return (_jsx("g", { onMouseMove: (evt) => handleMouseMove(evt, { ...ev, startStr }), onMouseLeave: hideTooltip, children: _jsx(TaskClip, { x: x, y: 0, w: w, h: h - 6, color: project?.color || '#FA3356', label: label, lod: lod }) }, `${t.name}-${i}`));
                                                                }) }, t.name));
                                                        }), playheadX != null && (_jsx("line", { x1: playheadX, x2: playheadX, y1: 0, y2: contentHeight, stroke: "#fff" }))] })] }), _jsxs("div", { className: "zoom-controls", style: { position: 'absolute', right: 10, top: 10 }, children: [_jsx("button", { type: "button", onClick: () => zoom.scale({ scaleX: 1.2, scaleY: 1 }), children: "+" }), _jsx("button", { type: "button", onClick: () => zoom.scale({ scaleX: 0.8, scaleY: 1 }), children: "-" })] })] }));
                            } }) })] }));
        } }));
    // Agenda chart (static)
    const renderAgenda = () => (_jsx(ParentSize, { children: ({ width: parentWidth }) => {
            const margin = { top: 10, right: 20, bottom: 20, left: 60 };
            // Dynamic row height for agenda
            const minRowHeight = 32;
            const maxRowHeight = 64;
            const minChartHeight = 300;
            const rowCount = agendaData.length;
            let rowHeight;
            if (rowCount <= 3) {
                rowHeight = maxRowHeight;
            }
            else if (rowCount <= 8) {
                rowHeight = minRowHeight + (maxRowHeight - minRowHeight) * (8 - rowCount) / 5;
            }
            else {
                rowHeight = minRowHeight;
            }
            const axisWidth = 24 * PX_PER_HOUR;
            const contentHeight = Math.max(rowCount * rowHeight, minChartHeight);
            const svgWidth = margin.left + margin.right + axisWidth;
            const svgHeight = margin.top + margin.bottom + contentHeight;
            const xScale = scaleLinear({ domain: [0, 24], range: [0, axisWidth] });
            const yScale = scaleBand({
                domain: agendaData.map((d) => d.description),
                range: [0, contentHeight],
                padding: 0.2,
            });
            const playheadDate = safeParse(currentDate);
            let playheadX = null;
            if (playheadDate) {
                const now = new Date();
                if (now.toDateString() === playheadDate.toDateString()) {
                    playheadX = now.getHours() * PX_PER_HOUR;
                }
            }
            return (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("svg", { width: svgWidth, height: svgHeight, style: { background: '#1a1a1a' }, children: [_jsxs(Group, { left: margin.left, top: margin.top, children: [agendaData.map((d, i) => {
                                    const x = d.start * PX_PER_HOUR;
                                    const y = yScale(d.description);
                                    const w = d.duration * PX_PER_HOUR;
                                    const h = yScale.bandwidth();
                                    return (_jsxs(Group, { onMouseMove: (evt) => handleMouseMove(evt, d), onMouseLeave: hideTooltip, children: [_jsx(Bar, { x: x, y: y, width: w, height: h, fill: project?.color || '#FA3356', rx: 4 }), _jsx("text", { x: x + 4, y: y + h / 2 + 4, fill: "#fff", fontSize: 10, children: d.description })] }, `${d.description}-${i}`));
                                }), playheadX != null && (_jsx("line", { x1: playheadX, x2: playheadX, y1: 0, y2: contentHeight, stroke: "#fff" }))] }), _jsx(AxisBottom, { top: margin.top + contentHeight, left: margin.left, scale: xScale, numTicks: 13, tickFormat: (h) => `${h}:00`, stroke: "#fff", tickStroke: "#fff", tickLabelProps: () => ({
                                fill: '#fff',
                                fontSize: 10,
                                textAnchor: 'middle',
                            }) })] }) }));
        } }));
    // Tooltip
    const renderTooltip = () => {
        if (!tooltipOpen || !tooltipData)
            return null;
        if (mode === 'overview') {
            return (_jsxs(TooltipWithBounds, { left: tooltipLeft, top: tooltipTop, style: tooltipStyles, children: [_jsx("p", { style: { color: '#FA3356', margin: 0 }, children: tooltipData.description || tooltipData.track }), _jsxs("p", { style: { margin: 0 }, children: ["Start date: ", tooltipData.startStr] }), _jsxs("p", { style: { margin: 0 }, children: ["Duration: ", Math.round(tooltipData.duration), " hours"] })] }));
        }
        return (_jsxs(TooltipWithBounds, { left: tooltipLeft, top: tooltipTop, style: tooltipStyles, children: [_jsx("p", { style: { color: '#FA3356', margin: 0 }, children: tooltipData.description }), _jsxs("p", { style: { margin: 0 }, children: ["Duration: ", tooltipData.rawHours, " hours"] })] }));
    };
    return (_jsxs("div", { className: "dashboard-item timeline-chart", children: [_jsx("h3", { style: { margin: 0, color: '#fff', textAlign: 'center' }, children: "Timeline" }), _jsx("div", { className: "chart-mode-toggle", children: _jsxs("div", { className: "segmented-control", role: "group", "aria-label": "Chart mode toggle", children: [_jsx("button", { type: "button", onClick: () => onModeChange && onModeChange('overview'), className: mode === 'overview' ? 'active' : '', "aria-pressed": mode === 'overview', children: "Overview" }), _jsx("button", { type: "button", onClick: () => onModeChange && onModeChange('agenda'), className: mode === 'agenda' ? 'active' : '', "aria-pressed": mode === 'agenda', children: "Agenda" })] }) }), mode === 'agenda' && (_jsx("div", { className: "agenda-date-row", children: _jsx("input", { type: "date", value: currentDate, onChange: (e) => onDateChange && onDateChange(e.target.value), className: "agenda-date-picker" }) })), mode === 'overview'
                ? tracks.length === 0
                    ? _jsx("p", { children: "No events" })
                    : renderOverview()
                : agendaData.length === 0
                    ? _jsx("p", { children: "No events on this date" })
                    : renderAgenda(), renderTooltip()] }));
};
export default TimelineChart;
