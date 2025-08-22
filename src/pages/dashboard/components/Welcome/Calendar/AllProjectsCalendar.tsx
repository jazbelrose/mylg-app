import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useData } from "../../../../../app/contexts/DataProvider";
import "./AllProjectsCalendar.css";
import { useNavigate } from "react-router-dom";
import { slugify } from "../../../../../utils/slug";
import { getColor } from "../../../../../utils/colorUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";

// --- Types ---
type TimelineEvent = {
  date?: string;            // Expecting YYYY-MM-DD or parseable string
  description?: string;
  [k: string]: any;
};

type Project = {
  projectId: string;
  title?: string;
  color?: string;
  dateCreated?: string;     // YYYY-MM-DD or parseable string
  finishline?: string;      // YYYY-MM-DD or parseable string
  thumbnail?: string;
  timelineEvents?: TimelineEvent[];
  // injected at runtime:
  lane?: number;
};

type CombinedTooltipItem = {
  projectId: string;
  title?: string;
  thumbnail?: string;
  finishline?: string;
  events: TimelineEvent[];
};

type RangeMap = Record<string, Project[]>;
type EventsMap = Record<string, (TimelineEvent & { projectId: string; title?: string })[]>;

// --- Helpers ---
function safeParseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  // allow simple YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map((p) => parseInt(p, 10));
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

// Returns YYYY-MM-DD in UTC (prevents TZ drift across tiles)
function getDateKey(date: Date | null | undefined): string | null {
  if (!date) return null;
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return utc.toISOString().slice(0, 10);
}

const titleKey = (t?: string) => (t ?? "").toString();

// --- Component ---
const AllProjectsCalendar: React.FC = () => {
  const { projects, fetchProjectDetails } = useData();
  const navigate = useNavigate();

  const colorMap = useMemo<Record<string, string | undefined>>(() => {
    const map: Record<string, string | undefined> = {};
    (projects ?? []).forEach((p) => {
      map[p.projectId] = p.color;
    });
    return map;
  }, [projects]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipOffset, setTooltipOffset] = useState(0);

  const isMobile = useMemo(
    () =>
      typeof window !== "undefined" &&
      "matchMedia" in window &&
      window.matchMedia("(hover: none)").matches,
    []
  );

  const handleProjectClick = async (project: Project, flashDate?: string) => {
    await fetchProjectDetails(project.projectId);
    const slug = slugify(project.title ?? "");
    navigate(`/dashboard/projects/${slug}`, {
      state: flashDate ? { flashDate } : undefined,
    });
  };

  // Assign non-overlapping "lanes" for running bars
  const projectsWithLanes = useMemo<Project[]>(() => {
    if (!projects?.length) return [];
    const sorted = [...projects].sort(
      (a, b) =>
        (safeParseDate(a.dateCreated)?.getTime() ?? 0) -
        (safeParseDate(b.dateCreated)?.getTime() ?? 0)
    );

    const lanes: (Date | null)[] = [];
    return sorted.map((p) => {
      const start = safeParseDate(p.dateCreated);
      const end = safeParseDate(p.finishline);
      let lane = 0;
      if (start && end) {
        while (lanes[lane] && (lanes[lane] as Date) >= start) {
          lane += 1;
        }
        lanes[lane] = end;
      }
      return { ...p, lane };
    });
  }, [projects]);

  const maxLane = useMemo<number>(
    () =>
      projectsWithLanes.length
        ? Math.max(...projectsWithLanes.map((p) => p.lane ?? 0))
        : 0,
    [projectsWithLanes]
  );

  // Map date -> projects active that day
  const rangeMap = useMemo<RangeMap>(() => {
    const map: RangeMap = {};
    if (!projectsWithLanes?.length) return map;

    projectsWithLanes.forEach((project) => {
      const start = safeParseDate(project.dateCreated);
      const end = safeParseDate(project.finishline);
      if (!(start && end)) return;

      // iterate days inclusive
      for (
        let d = new Date(start.getTime());
        d.getTime() <= end.getTime();
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        const key = getDateKey(d);
        if (!key) continue;
        if (!map[key]) map[key] = [];
        map[key].push(project);
      }
    });

    // de-dupe per day by projectId & keep lane info
    Object.keys(map).forEach((day) => {
      const byId: Record<string, Project> = {};
      map[day].forEach((p) => {
        byId[p.projectId] = p;
      });
      map[day] = Object.values(byId);
    });

    return map;
  }, [projectsWithLanes]);

  // Map date -> events (normalize to YYYY-MM-DD as well)
  const eventsMap = useMemo<EventsMap>(() => {
    const map: EventsMap = {};
    if (!projects?.length) return map;

    projects.forEach((project) => {
      if (!Array.isArray(project.timelineEvents)) return;
      project.timelineEvents.forEach((ev) => {
        const key = getDateKey(safeParseDate(ev.date ?? null));
        if (!key) return;
        if (!map[key]) map[key] = [];
        map[key].push({
          ...ev,
          projectId: project.projectId,
          title: project.title,
        });
      });
    });

    return map;
  }, [projects]);

  const displayKey = getDateKey(selectedDate);

  // Keep tooltip within viewport
  useLayoutEffect(() => {
    if (!hoverDate) {
      if (tooltipOffset !== 0) setTooltipOffset(0);
      return;
    }
    const el = tooltipRef.current;
    if (!el) return;
    const tile = el.parentElement;
    if (!tile) return;

    const margin = 4;
    const tooltipWidth = el.offsetWidth;
    const tileRect = tile.getBoundingClientRect();
    let offset = 0;

    const baseLeft = tileRect.left + tileRect.width / 2 - tooltipWidth / 2;
    const baseRight = baseLeft + tooltipWidth;

    if (baseLeft < margin) {
      offset = margin - baseLeft;
    } else if (baseRight > window.innerWidth - margin) {
      offset = window.innerWidth - margin - baseRight;
    }

    if (offset !== tooltipOffset) setTooltipOffset(offset);
     
  }, [hoverDate, tooltipOffset]);

  // Recalc tooltip on resize
  useEffect(() => {
    const handleResize = () => {
      if (hoverDate) setTooltipOffset(0);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hoverDate]);

  const tileContent: (args: { date: Date; view: "month" | "year" | "decade" | "century" }) => React.ReactNode = ({
    date,
    view,
  }) => {
    if (view !== "month") return null;

    const dayKey = getDateKey(date);
    const activeProjects = dayKey ? rangeMap[dayKey] ?? [] : [];
    const dayEvents = dayKey ? eventsMap[dayKey] ?? [] : [];

    // Merge projects + events (dedupe by projectId)
    const combined: Record<string, CombinedTooltipItem> = {};
    activeProjects.forEach((p) => {
      combined[p.projectId] = {
        projectId: p.projectId,
        title: p.title,
        thumbnail: p.thumbnail,
        finishline: p.finishline,
        events: [],
      };
    });
    dayEvents.forEach((ev) => {
      if (!combined[ev.projectId]) {
        combined[ev.projectId] = {
          projectId: ev.projectId,
          title: ev.title,
          thumbnail: undefined,
          finishline: undefined,
          events: [],
        };
      }
      combined[ev.projectId].events.push(ev);
    });

    // SAFE sort (prevents undefined.localeCompare crash)
    const tooltipItems = Object.values(combined).sort((a, b) =>
      titleKey(a.title).localeCompare(titleKey(b.title), undefined, { sensitivity: "base" })
    );

    const showHover = () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      hoverTimer.current = window.setTimeout(() => setHoverDate(date), 100);
    };
    const hideHover = () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      hoverTimer.current = window.setTimeout(() => setHoverDate(null), 200);
    };
    const handleClick = () => {
      setSelectedDate(date);
      if (isMobile) setHoverDate(date);
    };

    const isHovered = hoverDate && getDateKey(hoverDate) === dayKey;

    // Dots (events)
    const MAX_DOTS = 6;
    const showOverflow = dayEvents.length > MAX_DOTS;
    const dotsToRender = showOverflow ? dayEvents.slice(0, 2) : dayEvents.slice(0, MAX_DOTS);
    const overflowCount = showOverflow ? dayEvents.length - 2 : 0;

    return (
      <div
        className="tile-minimal"
        style={{ ["--lane-count" as any]: maxLane + 1 }}
        onMouseEnter={!isMobile ? showHover : undefined}
        onMouseLeave={!isMobile ? hideHover : undefined}
        onClick={handleClick}
      >
        <div className="tile-dots">
          {dotsToRender.map((e, idx) => (
            <FontAwesomeIcon
              key={`e-${idx}`}
              icon={faClock}
              className="event-dot"
              style={{ color: colorMap[e.projectId] || getColor(e.projectId) }}
              title={e.description}
            />
          ))}
          {overflowCount > 0 && <span className="event-overflow">+{overflowCount}</span>}
        </div>

        <div className="tile-date-number">{date.getDate()}</div>

        <div className="timeline-bars">
          {Array.from({ length: maxLane + 1 }).map((_, laneIdx) => {
            const proj = activeProjects.find((p) => p.lane === laneIdx);
            if (!proj) {
              return (
                <div
                  key={laneIdx}
                  className="timeline-bar"
                  style={{ visibility: "hidden" }}
                />
              );
            }

            const prevDate = new Date(date);
            prevDate.setDate(prevDate.getDate() - 1);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const prevKey = getDateKey(prevDate);
            const nextKey = getDateKey(nextDate);

            const prevProjects = prevKey ? rangeMap[prevKey] ?? [] : [];
            const nextProjects = nextKey ? rangeMap[nextKey] ?? [] : [];

            const hasPrev = prevProjects.some(
              (p) => p.projectId === proj.projectId && (p.lane ?? 0) === laneIdx
            );
            const hasNext = nextProjects.some(
              (p) => p.projectId === proj.projectId && (p.lane ?? 0) === laneIdx
            );

            return (
              <div
                key={laneIdx}
                className="timeline-bar"
                style={{
                  backgroundColor: colorMap[proj.projectId] || getColor(proj.projectId),
                  borderTopLeftRadius: hasPrev ? 0 : 5,
                  borderBottomLeftRadius: hasPrev ? 0 : 5,
                  borderTopRightRadius: hasNext ? 0 : 5,
                  borderBottomRightRadius: hasNext ? 0 : 5,
                }}
                title={proj.title}
                onClick={(e) => {
                  e.stopPropagation();
                  const flashDate = getDateKey(date) ?? undefined;
                  handleProjectClick(proj, flashDate);
                }}
              />
            );
          })}
        </div>

        {isHovered && tooltipItems.length > 0 && (
          <div
            ref={tooltipRef}
            className="tile-tooltip visible"
            style={{
              transform: `translateX(calc(-50% + ${tooltipOffset}px)) translateY(-4px)`,
            }}
          >
            {tooltipItems.slice(0, 3).map((item) => {
              const events = Array.isArray(item.events) ? item.events : [];
              return (
                <div
                  key={item.projectId}
                  className="tooltip-item"
                  onClick={() => handleProjectClick({ projectId: item.projectId, title: item.title } as Project)}
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title ?? "thumbnail"}
                      className="tooltip-thumb"
                    />
                  ) : null}
                  <div className="tooltip-text">
                    <div className="tooltip-header">
                      <span className="tooltip-title">{item.title ?? "Untitled"}</span>
                      {item.finishline && (
                        <span className="tooltip-date">
                          {new Date(item.finishline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {events.map((ev, idx) => (
                      <span key={idx} className="tooltip-info">
                        {(ev.description ?? "").toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {tooltipItems.length > 3 && (
              <div className="tooltip-more">+{tooltipItems.length - 3} more</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const tileClassName = () => null;

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (isMobile) setHoverDate(date);
    // (Kept for parity with your original) – combined is calculated on hover tile as well
    // If you want a click panel later, you already have the pieces here.
  };

  return (
    <div className="all-projects-calendar-wrapper">
      <Calendar
        onChange={(d) => setSelectedDate(d as Date)}
        value={selectedDate}
        tileContent={tileContent}
        tileClassName={tileClassName}
        onClickDay={handleDayClick}
        showNeighboringMonth={false}
        showFixedNumberOfWeeks
      />
    </div>
  );
};

export default AllProjectsCalendar;
