import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { v4 as uuid } from "uuid";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./ProjectCalendar.css";
import Modal from "../../../../components/ModalWithStack";
import { useData } from "../../../../app/contexts/DataProvider";
import { useSocket } from "../../../../app/contexts/SocketContext";
import { normalizeMessage } from "../../../../utils/websocketUtils";
import { getColor } from "../../../../utils/colorUtils";
import { createBudgetItem, updateBudgetItem } from "../../../../utils/api";
import { slugify } from "../../../../utils/slug";
import { parseBudget, formatUSD } from "../../../../utils/budgetUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { enqueueProjectUpdate } from "../../../../utils/requestQueue";
import useBudgetData from "./useBudgetData";

const CATEGORY_OPTIONS = [
  "AUDIO-VISUAL",
  "CLIENT-SERVICES-VIP",
  "CONTINGENCY-MISC",
  "DECOR",
  "DESIGN",
  "FABRICATION",
  "FOOD-BEVERAGE",
  "GRAPHICS",
  "INSTALLATION-MATERIALS",
  "LABOR",
  "LIGHTING",
  "MERCH-SWAG",
  "PARKING-FUEL-TOLLS",
  "PERMITS-INSURANCE",
  "PRODUCTION-MGMT",
  "RENTALS",
  "STORAGE",
  "TECH-INTERACTIVES",
  "TRAVEL",
  "TRUCKING",
  "VENUE-LOCATION-FEES",
  "WAREHOUSE",
];

const UNIT_OPTIONS = [
  "Each",
  "Hrs",
  "Days",
  "EA",
  "PCS",
  "Box",
  "LF",
  "SQFT",
  "KG",
];

function safeParse(dateStr) {
  if (!dateStr) return null;
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

// Format a Date object as YYYY-MM-DD using the browser's local timezone
function getDateKey(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeFinalCost(qty, budget, mark) {
  const budgetNum = parseBudget(budget);
  const markNum = parseFloat(String(mark).replace(/%/g, ""));
  const markupNum = Number.isNaN(markNum) ? 0 : markNum / 100;
  const qtyNum = parseFloat(qty) || 0;
  const final = budgetNum * (1 + markupNum) * (qtyNum || 1);
  return budgetNum ? formatUSD(final) : "";
}

const ProjectCalendar = ({
  project,
  initialFlashDate,
  onDateSelect,
  showEventList = true,
  onWrapperClick,
}) => {
  const { updateTimelineEvents, activeProject, user } = useData();
  const [saving, setSaving] = useState(false);
  const { ws } = useSocket();

  const startDate = useMemo(
    () => safeParse(project?.productionStart || project?.dateCreated),
    [project?.productionStart, project?.dateCreated]
  );
  const endDate = useMemo(() => {
    const parsed = safeParse(project?.finishline);
    if (!parsed && startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 30);
      return d;
    }
    return parsed;
  }, [project?.finishline, startDate]);

  const today = useMemo(() => new Date(), []);

  const landingDate = useMemo(() => {
    if (!startDate) return today;
    if (today < startDate) return startDate;
    if (endDate && today > endDate) return endDate;
    return today;
  }, [startDate, endDate, today]);

  const defaultActiveStartDate = useMemo(() => {
    if (startDate) {
      const rangeEnd = endDate || new Date(startDate.getTime() + 30 * 86400000);
      const midTime =
        startDate.getTime() + (rangeEnd.getTime() - startDate.getTime()) / 2;
      const mid = new Date(midTime);
      return new Date(mid.getFullYear(), mid.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [startDate, endDate, today]);



  const [selectedDate, setSelectedDate] = useState(landingDate);
  const [activeStartDate, setActiveStartDate] = useState(
    defaultActiveStartDate
  );
  const userNavigatedRef = useRef(false);
  const [events, setEvents] = useState(project?.timelineEvents || []);
  useEffect(() => {
    console.log('[ProjectCalendar] project.timelineEvents:', project?.timelineEvents);
  }, [project]);
  const [showModal, setShowModal] = useState(false);
  const [eventDesc, setEventDesc] = useState("");
  const [eventHours, setEventHours] = useState("");
  const [startDateInput, setStartDateInput] = useState(
    getDateKey(selectedDate)
  );
  const [endDateInput, setEndDateInput] = useState(getDateKey(selectedDate));
  const [descOptions, setDescOptions] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const hoverTimer = useRef(null);
  const calendarWrapperRef = useRef(null);
  const ignoreNextWrapperClickRef = useRef(false);
  const { budgetHeader, budgetItems, setBudgetItems } = useBudgetData(
    project?.projectId
  );
  const [flashDate, setFlashDate] = useState(
    initialFlashDate ? safeParse(initialFlashDate) : null
  );
  const [createLineItem, setCreateLineItem] = useState(false);
  const [category, setCategory] = useState("");
  const [elementKey, setElementKey] = useState("");
  const [elementId, setElementId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("Each");
  const [budgetedCost, setBudgetedCost] = useState("");
  const [markup, setMarkup] = useState("");
  const [finalCost, setFinalCost] = useState("");

  const queueEventsUpdate = async (events) => {
    if (!project?.projectId) return;
    try {
      setSaving(true);
      await enqueueProjectUpdate(updateTimelineEvents, project.projectId, events);
    } finally {
      setSaving(false);
    }
  };

  const handleDateSelection = (date) => {
    userNavigatedRef.current = true;
    setSelectedDate(date);
    if (onDateSelect) {
      const key = getDateKey(date);
      onDateSelect(key);
    }
  };

  useEffect(() => {
    if (initialFlashDate) {
      const d = safeParse(initialFlashDate);
      if (d) {
        setSelectedDate(d);
        setActiveStartDate(d);
        setFlashDate(d);
      }
    }
  }, [initialFlashDate]);
  const isMobile = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(hover: none)").matches,
    []
  );

  useEffect(() => {
    if (ws && project?.projectId) {
      ws.send(
        JSON.stringify({
          action: "setActiveConversation",
          conversationId: `project#${project.projectId}`,
        })
      );
    }
  }, [ws, project?.projectId]);

  useEffect(() => {
    if (!userNavigatedRef.current) {
      setSelectedDate(landingDate);
    }
  }, [landingDate]);

  useEffect(() => {
    if (initialFlashDate) return;
    if (!userNavigatedRef.current) {
      setActiveStartDate(defaultActiveStartDate);
    }
  }, [defaultActiveStartDate, initialFlashDate]);

  useEffect(() => {
    userNavigatedRef.current = false;
  }, [project?.projectId]);

  useEffect(() => {
  setEvents(project?.timelineEvents || []);
  console.log('[ProjectCalendar] events state after setEvents:', project?.timelineEvents);
  }, [project]);

  // live updates handled via SocketContext

  useEffect(() => {
    if (!flashDate) return;
    const t = setTimeout(() => setFlashDate(null), 800);
    return () => clearTimeout(t);
  }, [flashDate]);

  const rangeSet = useMemo(() => {
    const set = new Set();
    if (startDate && endDate) {
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        set.add(getDateKey(d));
      }
    }
    return set;
  }, [startDate, endDate]);
  const eventsByDate = events.reduce((acc, ev) => {
    if (ev.date) {
      if (!acc[ev.date]) acc[ev.date] = [];
      acc[ev.date].push(ev);
    }
    return acc;
  }, {});

  const extractDescOptions = useCallback((evts) => {
    return Array.from(
      new Set(
        evts
          .map((ev) => (ev.description || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }, []);

  useEffect(() => {
    setDescOptions(extractDescOptions(events));
  }, [events, extractDescOptions]);

  const getNextElementKey = useCallback(() => {
    const slug = slugify(activeProject?.title || "");
    let max = 0;
    budgetItems.forEach((it) => {
      if (typeof it.elementKey === "string") {
        const match = it.elementKey.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > max) max = num;
        }
      }
    });
    const nextNum = String(max + 1).padStart(4, "0");
    return `${slug}-${nextNum}`;
  }, [activeProject?.title, budgetItems]);

  const getNextElementId = useCallback(
    (cat) => {
      if (!cat) return "";
      let max = 0;
      budgetItems.forEach((it) => {
        if (it.category === cat && typeof it.elementId === "string") {
          const match = it.elementId.match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > max) max = num;
          }
        }
      });
      return `${cat}-${String(max + 1).padStart(4, "0")}`;
    },
    [budgetItems]
  );

  useEffect(() => {
    if (createLineItem) {
      const cat = category || CATEGORY_OPTIONS[0];
      if (!category) setCategory(cat);
      setElementKey(getNextElementKey());
      setElementId(getNextElementId(cat));
    }
  }, [createLineItem, getNextElementKey, getNextElementId, category]);

  useEffect(() => {
    if (createLineItem && category) {
      setElementId(getNextElementId(category));
    }
  }, [category, createLineItem, getNextElementId]);

  useEffect(() => {
    setFinalCost(computeFinalCost(quantity, budgetedCost, markup));
  }, [quantity, budgetedCost, markup]);

  const saveEvent = async (e) => {
    if (e) e.preventDefault();
    const start = safeParse(startDateInput) || selectedDate;
    let end = safeParse(endDateInput);
    if (!end || end < start) end = start;
    const desc = eventDesc.trim().toUpperCase();

    const existing =
      editId !== null ? events.find((ev) => ev.id === editId) : null;
    const existingBudgetItemId = existing?.budgetItemId || null;

    let createdBudgetItemId = null;
    let updatedBudgetItem = null;

    if (createLineItem && budgetHeader?.budgetId && project?.projectId) {
      try {
        const markNum = parseFloat(String(markup).replace(/%/g, ""));
        const markupNum = Number.isNaN(markNum) ? 0 : markNum / 100;
        const qtyNum = parseFloat(quantity) || 0;
        const budgetNum = parseBudget(budgetedCost);
        const finalCost = budgetNum * (1 + markupNum) * (qtyNum || 1);
        const itemData = {
          description: desc,
          category,
          elementKey,
          elementId,
          quantity: qtyNum,
          unit,
          itemBudgetedCost: budgetNum,
          itemMarkUp: markupNum,
          itemFinalCost: finalCost,
          revision: budgetHeader.revision,
        };
        if (existingBudgetItemId) {
          updatedBudgetItem = await updateBudgetItem(
            project.projectId,
            existingBudgetItemId,
            itemData
          );
          setBudgetItems((prev) =>
            prev.map((it) =>
              it.budgetItemId === existingBudgetItemId ? updatedBudgetItem : it
            )
          );
        } else {
          const item = await createBudgetItem(
            project.projectId,
            budgetHeader.budgetId,
            {
              ...itemData,
              budgetItemId: `LINE-${uuid()}`,
            }
          );
          createdBudgetItemId = item.budgetItemId;
          setBudgetItems((prev) => [...prev, item]);
        }
      } catch (err) {
        console.error("Error creating budget item", err);
      }
    }

    const budgetItemId = createdBudgetItemId || existingBudgetItemId || null;

    let updated = editId !== null ? events.filter((ev) => ev.id !== editId) : [...events];

    for (let d = new Date(start), i = 0; d <= end; d.setDate(d.getDate() + 1), i++) {
      const dateKey = getDateKey(d);
      const ev = {
        id: i === 0 && editId !== null ? editId : uuid(),
        date: dateKey,
        description: desc,
        hours: eventHours,
      };
      if (budgetItemId) ev.budgetItemId = budgetItemId;
      updated.push(ev);
    }

    setEvents(updated);
    setDescOptions(extractDescOptions(updated));
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify(
          normalizeMessage(
            {
              action: "timelineUpdated",
              projectId: project.projectId,
              title: activeProject.title,
              events: updated,
              conversationId: `project#${project.projectId}`,
              username: user?.firstName || "Someone",
              senderId: user.userId,
            },
            "timelineUpdated"
          )
        )
      );
    }
    await queueEventsUpdate(updated);
    setShowModal(false);
    setEventDesc("");
    setEventHours("");
    setEditId(null);
    setCreateLineItem(false);
    setCategory("");
    setElementKey("");
    setElementId("");
    setQuantity(1);
    setUnit("Each");
    setBudgetedCost("");
    setMarkup("");
    setFinalCost("");
    const key = getDateKey(selectedDate);
    setStartDateInput(key);
    setEndDateInput(key);
  };

  const openAddEventModal = (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setEventDesc("");
    setEventHours("");
    setEditId(null);
    setCreateLineItem(false);
    setCategory("");
    setElementKey("");
    setElementId("");
    setQuantity(1);
    setUnit("Each");
    setBudgetedCost("");
    setMarkup("");
    setFinalCost("");
    const key = getDateKey(selectedDate);
    setStartDateInput(key);
    setEndDateInput(key);
    setShowModal(true);
  };

const handleWrapperClick = (e) => {
    if (showModal) return;
    if (ignoreNextWrapperClickRef.current) {
      ignoreNextWrapperClickRef.current = false;
      return;
    }
    if (onWrapperClick) onWrapperClick(e);
  };
  
  const handleDescChange = (e) => {
    setEventDesc(e.target.value.toUpperCase());
  };

  const handleBudgetedCostChange = (e) => {
    setBudgetedCost(e.target.value);
  };

  const handleBudgetedCostBlur = (e) => {
    const val = e.target.value;
    const num = parseBudget(val);
    setBudgetedCost(num ? String(num) : "");
  };

  const handleMarkupChange = (e) => {
    setMarkup(e.target.value);
  };

  const handleMarkupBlur = (e) => {
    const num = parseFloat(String(e.target.value).replace(/%/g, ""));
    if (!Number.isNaN(num)) {
      setMarkup(`${num}%`);
    } else {
      setMarkup("");
    }
  };

  const openEditEventModal = (id) => {
    const ev = events.find((e) => e.id === id);
    if (ev) {
      setSelectedDate(safeParse(ev.date) || new Date());
      setEventDesc((ev.description || "").toUpperCase());
      setEventHours(ev.hours || "");
      setStartDateInput(ev.date || getDateKey(selectedDate));
      setEndDateInput(ev.date || getDateKey(selectedDate));
      setEditId(id);
      if (ev.budgetItemId) {
        const item = budgetItems.find(
          (it) => it.budgetItemId === ev.budgetItemId
        );
        if (item) {
          setCreateLineItem(true);
          setCategory(item.category || "");
          setElementKey(item.elementKey || "");
          setElementId(item.elementId || "");
          setQuantity(item.quantity ?? 1);
          setUnit(item.unit || "Each");
          setBudgetedCost(
            item.itemBudgetedCost != null ? String(item.itemBudgetedCost) : ""
          );
          setMarkup(
            item.itemMarkUp != null ? `${(item.itemMarkUp || 0) * 100}%` : ""
          );
          setFinalCost(
            item.itemFinalCost != null ? formatUSD(item.itemFinalCost) : ""
          );
        } else {
          setCreateLineItem(false);
        }
      } else {
        setCreateLineItem(false);
      }
      setShowModal(true);
    }
  };

  const focusCalendarOnDate = (date) => {
    if (!date) return;
    setFlashDate(date);
    setActiveStartDate(date);
    userNavigatedRef.current = true;
    calendarWrapperRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const key = getDateKey(date);
    const dayEvents = eventsByDate[key] || [];

    const showHover = () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => setHoverDate(date), 100);
    };

    const hideHover = () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => setHoverDate(null), 200);
    };

    const handleClick = () => {
      handleDateSelection(date);
      if (isMobile) setHoverDate(date);
    };

    const isHovered = hoverDate && getDateKey(hoverDate) === key;
    const totalHours = dayEvents.reduce(
      (sum, ev) => sum + Number(ev.hours || 0),
      0
    );

    return (
      <div
        className="calendar-day"
        onMouseEnter={!isMobile ? showHover : undefined}
        onMouseLeave={!isMobile ? hideHover : undefined}
        onClick={handleClick}
      >
        <div className="tile-dots">
          {dayEvents.map((e, idx) => {
            const id = e.description || String(idx);
            const color = project?.color || getColor(id);
            return (
              <FontAwesomeIcon
                key={idx}
                icon={faClock}
                className="event-dot"
                style={{ color }}
              />
            );
          })}
        </div>
        <div className="tile-date-number">{date.getDate()}</div>
        {rangeSet.has(key) && (
          <div className="timeline-bars">
            {(() => {
              const prevDate = new Date(date);
              prevDate.setDate(prevDate.getDate() - 1);
              const nextDate = new Date(date);
              nextDate.setDate(nextDate.getDate() + 1);
              const prevInRange = rangeSet.has(getDateKey(prevDate));
              const nextInRange = rangeSet.has(getDateKey(nextDate));
              return (
                <div
                  className="timeline-bar"
                  style={{
                    backgroundColor:
                      project?.color || getColor(project?.projectId),
                    borderTopLeftRadius: prevInRange ? 0 : "5px",
                    borderBottomLeftRadius: prevInRange ? 0 : "5px",
                    borderTopRightRadius: nextInRange ? 0 : "5px",
                    borderBottomRightRadius: nextInRange ? 0 : "5px",
                  }}
                />
              );
            })()}
          </div>
        )}

        {isHovered && dayEvents.length > 0 && (
          <div className="tile-tooltip visible">
            {dayEvents.map((e, idx) => (
              <div key={idx} className="tooltip-item">
                <FontAwesomeIcon
                  icon={faClock}
                  className="tooltip-dot"
                  style={{
                    color:
                      project?.color || getColor(e.description || String(idx)),
                  }}
                />
                <span className="tooltip-text">
                  {e.description?.toUpperCase()} ({e.hours}{" "}
                  {Number(e.hours) === 1 ? "HR" : "HRS"})
                </span>
              </div>
            ))}
            <div className="tooltip-info">{totalHours} hrs</div>
          </div>
        )}
      </div>
    );
  };

  const tileClassName = ({ date, view }) => {
    const classes = ["calendar-day"];
    if (
      view === "month" &&
      flashDate &&
      getDateKey(date) === getDateKey(flashDate)
    ) {
      classes.push("tile-highlight");
    }
    return classes.join(" ");
  };
  const eventsForSelected = eventsByDate[getDateKey(selectedDate)] || [];

  const eventDateKeys = Object.keys(eventsByDate).sort();
  const currentKey = getDateKey(selectedDate);

  const goToPrevEventDate = () => {
    const prev = [...eventDateKeys].reverse().find((d) => d < currentKey);
    if (prev) {
      const date = safeParse(prev);
      handleDateSelection(date);
      focusCalendarOnDate(date);
    }
  };

  const goToNextEventDate = () => {
    const next = eventDateKeys.find((d) => d > currentKey);
    if (next) {
      const date = safeParse(next);
      handleDateSelection(date);
      focusCalendarOnDate(date);
    }
  };

  const hasPrevEvent = eventDateKeys.some((d) => d < currentKey);
  const hasNextEvent = eventDateKeys.some((d) => d > currentKey);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showModal) return;
      if (e.key === "ArrowLeft") {
        goToPrevEventDate();
      } else if (e.key === "ArrowRight") {
        goToNextEventDate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, eventDateKeys, currentKey]);

  const totalHoursForDay = eventsForSelected.reduce(
    (sum, ev) => sum + Number(ev.hours || 0),
    0
  );

  const totalHoursForProject = events.reduce(
    (sum, ev) => sum + Number(ev.hours || 0),
    0
  );


  const deleteEvent = async (id) => {
    const updated = events.filter((ev) => ev.id !== id);
    setEvents(updated);
    setDescOptions(extractDescOptions(updated));
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify(
          normalizeMessage(
            {
              action: "timelineUpdated",
              projectId: project.projectId,
              title: activeProject.title,
              events: updated,
              conversationId: `project#${project.projectId}`,
              username: user?.firstName || "Someone",
              senderId: user.userId,
            },
            "timelineUpdated"
          )
        )
      );
    }
    await queueEventsUpdate(updated);
  };

  return (
    <div
      className="dashboard-item project-calendar-wrapper"
      onClick={handleWrapperClick}
    >
      {saving && (
        <div style={{ color: '#FA3356', marginBottom: '10px' }}>Saving...</div>
      )}
      <div ref={calendarWrapperRef} className="calendar-content">
        <Calendar
          onChange={handleDateSelection}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
          activeStartDate={activeStartDate}
          onActiveStartDateChange={({ action, activeStartDate }) => {
            setActiveStartDate(activeStartDate);
            if (
              ["prev", "next", "drillUp", "drillDown", "onChange"].includes(
                action
              )
            ) {
              userNavigatedRef.current = true;
            }
          }}
          prevLabel={<FontAwesomeIcon icon={faChevronLeft} />}
          nextLabel={<FontAwesomeIcon icon={faChevronRight} />}
          prev2Label={null}
          next2Label={null}
        />
        {showEventList && (
          <>
            <div className="events-nav">
              <button onClick={goToPrevEventDate} disabled={!hasPrevEvent}>
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button onClick={goToNextEventDate} disabled={!hasNextEvent}>
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
            <div className="events-log">
              <h3 className="events-log-date">
                Events on {getDateKey(selectedDate)}
              </h3>
              {eventsForSelected.length === 0 ? (
                <div>No events</div>
              ) : (
                <ul>
                  {eventsForSelected.map((e, idx) => {
                    const id = e.description || String(idx);
                    const color = project?.color || getColor(id);
                    return (
                      <li key={e.id || idx} className="event-item">
                        <FontAwesomeIcon
                          icon={faClock}
                          className="list-dot"
                          style={{ color }}
                        />
                        {e.description?.toUpperCase()} ({e.hours}{" "}
                        {Number(e.hours) === 1 ? "HR" : "HRS"})
                        <button
                          className="edit-event-btn"
                          onClick={() => openEditEventModal(e.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-event-btn"
                          onClick={() => deleteEvent(e.id)}
                        >
                          Delete
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="events-log-totals">
                <span>Day Total: {totalHoursForDay} hrs</span>
                <span>Project Total: {totalHoursForProject} hrs</span>
              </div>
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        className="address-button add-event-button"
        onClick={openAddEventModal}
      >
        Add Event
      </button>
      <Modal
        isOpen={showModal}
        onRequestClose={(event) => {
          if (event?.type === "click") {
            ignoreNextWrapperClickRef.current = true;
          }
          setShowModal(false);
        }}
        contentLabel="Add Event"
        style={{
          overlay: { backgroundColor: "rgba(0, 0, 0, 0.75)" },
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            color: "white",
            width: "400px",
            maxHeight: "90vh",
            padding: "20px",
            borderRadius: "20px",
            overflow: "auto",
          },
        }}
      >
        <h3 className="add-event-title">
          {editId !== null ? "Edit" : "Add"} Event
        </h3>
        <form onSubmit={saveEvent} className="modal-form">
          <input
            type="date"
            placeholder="Start Date"
            value={startDateInput}
            onChange={(e) => setStartDateInput(e.target.value)}
            className="modal-input"
          />
          <input
            type="date"
            placeholder="End Date"
            value={endDateInput}
            onChange={(e) => setEndDateInput(e.target.value)}
            className="modal-input"
          />
          <input
            type="text"
            placeholder="Description"
            value={eventDesc}
            onChange={handleDescChange}
            className="modal-input-description"
            list="event-desc-options"
          />
          <div className="unit-input-wrapper">
            <input
              type="text"
              placeholder="Hours"
              value={eventHours}
              onChange={(e) => setEventHours(e.target.value)}
              className="modal-input unit-input"
            />
            <span className="unit-suffix">Hrs</span>
          </div>
          <label style={{ marginTop: "10px" }}>
            <input
              type="checkbox"
              checked={createLineItem}
              onChange={(e) => setCreateLineItem(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Create budget line item
          </label>
          {createLineItem && (
            <>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="modal-input"
              >
                <option hidden value="" />
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Element Key"
                value={elementKey}
                onChange={(e) => setElementKey(e.target.value)}
                className="modal-input"
              />
              <input
                type="text"
                placeholder="Element ID"
                value={elementId}
                onChange={(e) => setElementId(e.target.value)}
                className="modal-input"
              />
              <div className="unit-input-wrapper">
                <input
                  type="number"
                  placeholder={
                    unit.toLowerCase().includes("hr") ? "Hours" : "Quantity"
                  }
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="modal-input unit-input"
                />
                {unit.toLowerCase().includes("hr") && (
                  <span className="unit-suffix">hrs</span>
                )}
              </div>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="modal-input"
              >
                <option hidden value="" />
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <div className="currency-input-wrapper">
                {budgetedCost && <span className="currency-prefix">$</span>}
                <input
                  type="text"
                  placeholder="Budgeted Cost"
                  value={budgetedCost}
                  onChange={handleBudgetedCostChange}
                  onBlur={handleBudgetedCostBlur}
                  className={`modal-input ${
                    budgetedCost ? "currency-input" : ""
                  }`}
                />
              </div>
              <input
                type="text"
                placeholder="Markup %"
                value={markup}
                onChange={handleMarkupChange}
                onBlur={handleMarkupBlur}
                className="modal-input"
              />
              <input
                type="text"
                placeholder="Final Cost"
                value={finalCost}
                readOnly
                className="modal-input"
              />
            </>
          )}
          <datalist id="event-desc-options">
            {descOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <button className="modal-submit-button" type="submit">
            Save
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectCalendar;
