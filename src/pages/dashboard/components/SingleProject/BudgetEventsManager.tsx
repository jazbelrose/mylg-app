import React, { useCallback, useState } from "react";
import { v4 as uuid } from "uuid";

interface BudgetEventsManagerProps {
  activeProject: any;
  queueEventsUpdate: (events: any[]) => Promise<void>;
  emitTimelineUpdate: (events: any[]) => void;
}

export const useBudgetEventsManager = ({
  activeProject,
  queueEventsUpdate,
  emitTimelineUpdate,
}: BudgetEventsManagerProps) => {
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [eventItem, setEventItem] = useState<any>(null);
  const [eventList, setEventList] = useState<any[]>([]);

  const openEventModal = useCallback((item: any, eventsByLineItem: Record<string, any[]>, lockedLines: string[]) => {
    if (lockedLines.includes(item.budgetItemId)) return;
    const evs = eventsByLineItem[item.budgetItemId] || [];
    setEventItem(item);
    setEventList(evs.map((ev) => ({ ...ev })));
    setEventModalOpen(true);
  }, []);

  const closeEventModal = useCallback(() => {
    setEventModalOpen(false);
    setEventItem(null);
    setEventList([]);
  }, []);

  const handleSaveEvents = useCallback(async (events: any[]) => {
    if (!activeProject?.projectId || !eventItem) {
      closeEventModal();
      return;
    }
    let others = Array.isArray(activeProject?.timelineEvents)
      ? activeProject.timelineEvents.filter((ev) => ev.budgetItemId !== eventItem.budgetItemId)
      : [];
    const withIds = events.map((ev) => ({
      id: ev.id || uuid(),
      date: ev.date,
      hours: ev.hours,
      description: ev.description || '',
      budgetItemId: eventItem.budgetItemId,
    }));
    const updated = [...others, ...withIds];
    try {
      await queueEventsUpdate(updated);
      emitTimelineUpdate(updated);
    } catch (err) {
      console.error('Error saving events', err);
    }
    closeEventModal();
  }, [activeProject?.projectId, activeProject?.timelineEvents, eventItem, queueEventsUpdate, emitTimelineUpdate, closeEventModal]);

  return {
    isEventModalOpen,
    eventItem,
    eventList,
    openEventModal,
    closeEventModal,
    handleSaveEvents,
  };
};