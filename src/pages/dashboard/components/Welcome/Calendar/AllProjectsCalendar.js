import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState, useRef, useEffect, useLayoutEffect, } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css"; // default styles
import { useData } from "../../../../../app/contexts/DataProvider";
import "./AllProjectsCalendar.css";
import { useNavigate } from "react-router-dom";
import { slugify } from "../../../../../utils/slug";
import { getColor } from "../../../../../utils/colorUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
// Thumbnail component with graceful fallback and preloading
// Helper: safely parse date strings.
function safeParseDate(dateStr) {
    if (!dateStr)
        return null;
    // handle plain YYYY-MM-DD strings
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split("-").map((p) => parseInt(p, 10));
        return new Date(year, month - 1, day);
    }
    const parsed = new Date(dateStr);
    if (!Number.isNaN(parsed.getTime())) {
        // normalize to remove time component
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
    return null;
}
// Convert a Date object to a YYYY-MM-DD key in UTC to avoid timezone issues
function getDateKey(date) {
    if (!date)
        return null;
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return utc.toISOString().slice(0, 10);
}
const AllProjectsCalendar = () => {
    // Destructure needed functions from useData for handling clicks.
    const { projects, fetchProjectDetails } = useData();
    const colorMap = useMemo(() => {
        const map = {};
        (projects || []).forEach((p) => {
            map[p.projectId] = p.color;
        });
        return map;
    }, [projects]);
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [hoverDate, setHoverDate] = useState(null);
    const hoverTimer = useRef(null);
    const tooltipRef = useRef(null);
    const [tooltipOffset, setTooltipOffset] = useState(0);
    const isMobile = useMemo(() => typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(hover: none)").matches, []);
    // Define the click handler similar to AllProjects.
    const handleProjectClick = async (project, flashDate) => {
        await fetchProjectDetails(project.projectId);
        const slug = slugify(project.title);
        navigate(`/dashboard/projects/${slug}`, {
            state: flashDate ? { flashDate } : undefined,
        });
    };
    // Assign projects to lanes so overlapping ranges don't collide
    const projectsWithLanes = useMemo(() => {
        if (!projects || projects.length === 0)
            return [];
        // sort by start date for deterministic lane assignment
        const sorted = [...projects].sort((a, b) => safeParseDate(a.dateCreated) - safeParseDate(b.dateCreated));
        const lanes = [];
        return sorted.map((p) => {
            const start = safeParseDate(p.dateCreated);
            const end = safeParseDate(p.finishline);
            let lane = 0;
            if (start && end) {
                while (lanes[lane] && lanes[lane] >= start) {
                    lane += 1;
                }
                lanes[lane] = end;
            }
            return { ...p, lane };
        });
    }, [projects]);
    const maxLane = useMemo(() => projectsWithLanes.length > 0
        ? Math.max(...projectsWithLanes.map((p) => p.lane))
        : 0, [projectsWithLanes]);
    const rangeMap = useMemo(() => {
        const map = {};
        if (!projectsWithLanes || projectsWithLanes.length === 0)
            return map;
        projectsWithLanes.forEach((project) => {
            const start = safeParseDate(project?.dateCreated);
            const end = safeParseDate(project?.finishline);
            if (start && end) {
                for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                    const key = getDateKey(d);
                    if (!map[key])
                        map[key] = {};
                    map[key][project.projectId] = project;
                }
            }
        });
        // Convert inner maps to arrays for easy mapping
        Object.keys(map).forEach((day) => {
            map[day] = Object.values(map[day]);
        });
        return map;
    }, [projectsWithLanes]);
    const eventsMap = useMemo(() => {
        const map = {};
        if (!projects || projects.length === 0)
            return map;
        projects.forEach((project) => {
            if (Array.isArray(project.timelineEvents)) {
                project.timelineEvents.forEach((ev) => {
                    if (!ev.date)
                        return;
                    if (!map[ev.date])
                        map[ev.date] = [];
                    map[ev.date].push({
                        ...ev,
                        projectId: project.projectId,
                        title: project.title,
                    });
                });
            }
        });
        return map;
    }, [projects]);
    const displayKey = getDateKey(selectedDate);
    // Ensure the tooltip doesn't extend beyond the viewport when visible.
    // Compute the ideal offset based on the tile position and tooltip width.
    useLayoutEffect(() => {
        if (!hoverDate) {
            if (tooltipOffset !== 0)
                setTooltipOffset(0);
            return;
        }
        const el = tooltipRef.current;
        if (!el)
            return;
        const tile = el.parentElement;
        if (!tile)
            return;
        const margin = 4;
        const tooltipWidth = el.offsetWidth;
        const tileRect = tile.getBoundingClientRect();
        let offset = 0;
        const baseLeft = tileRect.left + tileRect.width / 2 - tooltipWidth / 2;
        const baseRight = baseLeft + tooltipWidth;
        if (baseLeft < margin) {
            offset = margin - baseLeft;
        }
        else if (baseRight > window.innerWidth - margin) {
            offset = window.innerWidth - margin - baseRight;
        }
        if (offset !== tooltipOffset) {
            setTooltipOffset(offset);
        }
    }, [hoverDate, tooltipOffset]);
    // Recalculate tooltip position on window resize for responsiveness
    useEffect(() => {
        const handleResize = () => {
            if (hoverDate) {
                setTooltipOffset(0); // trigger recalculation in layout effect
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [hoverDate]);
    const tileContent = ({ date, view }) => {
        if (view !== "month")
            return null;
        const dayKey = getDateKey(date);
        const activeProjects = rangeMap[dayKey] || [];
        const dayEvents = eventsMap[dayKey] || [];
        // Merge projects and events while deduplicating by project
        const combined = {};
        activeProjects.forEach((p) => {
            combined[p.projectId] = { ...p, events: [] };
        });
        dayEvents.forEach((ev) => {
            if (!combined[ev.projectId]) {
                combined[ev.projectId] = {
                    projectId: ev.projectId,
                    title: ev.title,
                    events: [],
                };
            }
            combined[ev.projectId].events.push(ev);
        });
        const tooltipItems = Object.values(combined).sort((a, b) => a.title.localeCompare(b.title));
        const showHover = () => {
            if (hoverTimer.current)
                clearTimeout(hoverTimer.current);
            hoverTimer.current = setTimeout(() => setHoverDate(date), 100);
        };
        const hideHover = () => {
            if (hoverTimer.current)
                clearTimeout(hoverTimer.current);
            hoverTimer.current = setTimeout(() => setHoverDate(null), 200);
        };
        const handleClick = () => {
            setSelectedDate(date);
            if (isMobile)
                setHoverDate(date);
        };
        const isHovered = hoverDate && getDateKey(hoverDate) === dayKey;
        // Determine which event dots to display and calculate overflow
        const MAX_DOTS = 6;
        const showOverflow = dayEvents.length > MAX_DOTS;
        const dotsToRender = showOverflow
            ? dayEvents.slice(0, 2)
            : dayEvents.slice(0, MAX_DOTS);
        const overflowCount = showOverflow ? dayEvents.length - 2 : 0;
        return (_jsxs("div", { className: "tile-minimal", style: { '--lane-count': maxLane + 1 }, onMouseEnter: !isMobile ? showHover : undefined, onMouseLeave: !isMobile ? hideHover : undefined, onClick: handleClick, children: [_jsxs("div", { className: "tile-dots", children: [dotsToRender.map((e, idx) => (_jsx(FontAwesomeIcon, { icon: faClock, className: "event-dot", style: { color: colorMap[e.projectId] || getColor(e.projectId) } }, `e-${idx}`))), overflowCount > 0 && (_jsxs("span", { className: "event-overflow", children: ["+", overflowCount] }))] }), _jsx("div", { className: "tile-date-number", children: date.getDate() }), _jsx("div", { className: "timeline-bars", children: Array.from({ length: maxLane + 1 }).map((_, laneIdx) => {
                        const proj = activeProjects.find((p) => p.lane === laneIdx);
                        if (!proj) {
                            return (_jsx("div", { className: "timeline-bar", style: { visibility: 'hidden' } }, laneIdx));
                        }
                        const prevDate = new Date(date);
                        prevDate.setDate(prevDate.getDate() - 1);
                        const nextDate = new Date(date);
                        nextDate.setDate(nextDate.getDate() + 1);
                        const prevKey = getDateKey(prevDate);
                        const nextKey = getDateKey(nextDate);
                        const prevProjects = rangeMap[prevKey] || [];
                        const nextProjects = rangeMap[nextKey] || [];
                        const hasPrev = prevProjects.some((p) => p.projectId === proj.projectId && p.lane === laneIdx);
                        const hasNext = nextProjects.some((p) => p.projectId === proj.projectId && p.lane === laneIdx);
                        return (_jsx("div", { className: "timeline-bar", style: {
                                backgroundColor: colorMap[proj.projectId] || getColor(proj.projectId),
                                borderTopLeftRadius: hasPrev ? 0 : '5px',
                                borderBottomLeftRadius: hasPrev ? 0 : '5px',
                                borderTopRightRadius: hasNext ? 0 : '5px',
                                borderBottomRightRadius: hasNext ? 0 : '5px',
                            } }, laneIdx));
                    }) }), isHovered && tooltipItems.length > 0 && (_jsxs("div", { ref: tooltipRef, className: "tile-tooltip visible", style: {
                        transform: `translateX(calc(-50% + ${tooltipOffset}px)) translateY(-4px)`,
                    }, children: [tooltipItems.slice(0, 3).map((item) => {
                            const events = Array.isArray(item.events) ? item.events : [];
                            return (_jsxs("div", { className: "tooltip-item", onClick: () => handleProjectClick(item), children: [item.thumbnail ? (_jsx("img", { src: item.thumbnail, alt: item.title, className: "tooltip-thumb" })) : null, _jsxs("div", { className: "tooltip-text", children: [_jsxs("div", { className: "tooltip-header", children: [_jsx("span", { className: "tooltip-title", children: item.title }), item.finishline && (_jsx("span", { className: "tooltip-date", children: new Date(item.finishline).toLocaleDateString() }))] }), events.map((ev, idx) => (_jsx("span", { className: "tooltip-info", children: ev.description?.toUpperCase() }, idx)))] })] }, item.projectId));
                        }), tooltipItems.length > 3 && (_jsxs("div", { className: "tooltip-more", children: ["+", tooltipItems.length - 3, " more"] }))] }))] }));
    };
    // No extra tile classes
    const tileClassName = () => null;
    const handleDayClick = (date) => {
        setSelectedDate(date);
        if (isMobile)
            setHoverDate(date);
        const key = getDateKey(date);
        const activeProjects = rangeMap[key] || [];
        const dayEvents = eventsMap[key] || [];
        const combined = {};
        activeProjects.forEach((p) => {
            combined[p.projectId] = { ...p, events: [] };
        });
        dayEvents.forEach((ev) => {
            if (!combined[ev.projectId]) {
                combined[ev.projectId] = {
                    projectId: ev.projectId,
                    title: ev.title,
                    events: [],
                };
            }
            combined[ev.projectId].events.push(ev);
        });
    };
    return (_jsx("div", { className: "all-projects-calendar-wrapper", children: _jsx(Calendar, { onChange: setSelectedDate, value: selectedDate, tileContent: tileContent, tileClassName: tileClassName, onClickDay: handleDayClick, showNeighboringMonth: false, showFixedNumberOfWeeks: true }) }));
};
export default AllProjectsCalendar;
