import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useLayoutEffect,
} from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faClone,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { v4 as uuid } from "uuid";
import styles from "./BudgetPage.module.css";

import ProjectPageLayout from "./components/SingleProject/ProjectPageLayout";
import ProjectHeader from "./components/SingleProject/ProjectHeader";
import QuickLinksComponent from "./components/SingleProject/QuickLinksComponent";
import FileManagerComponent from "./components/SingleProject/FileManager";
import BudgetHeader from "./components/SingleProject/BudgetHeader";
import BudgetChart from "./components/SingleProject/BudgetChart";
import BudgetToolbar from "./components/SingleProject/BudgetToolbar";
import BudgetItemsTable from "./components/SingleProject/BudgetItemsTable";
import BudgetModals from "./components/SingleProject/BudgetModals";
import { useBudgetBusinessLogic } from "./components/SingleProject/useBudgetBusinessLogic";
import { useBudgetModals } from "./components/SingleProject/useBudgetModals";
import { useBudgetWebSocket } from "./components/SingleProject/useBudgetWebSocket";
import { useBudgetFileHandler } from "./components/SingleProject/useBudgetFileHandler";
import { useBudgetRevisions } from "./components/SingleProject/useBudgetRevisions";
import useBudgetData from "./components/SingleProject/useBudgetData";
import { useData } from "../../app/contexts/DataProvider";
import { useSocket } from "../../app/contexts/SocketContext";
import { findProjectBySlug, slugify } from "../../utils/slug";
import { formatUSD } from "../../utils/budgetUtils";
import { updateBudgetItem } from "../../utils/api";
import { enqueueProjectUpdate } from "../../utils/requestQueue";

const TABLE_HEADER_FOOTER = 110;
const TABLE_BOTTOM_MARGIN = 20;

const BudgetPage = () => {
  const { projectSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeProject: initialActiveProject,
    projects,
    fetchProjectDetails,
    user,
    userId,
    setProjects,
    setSelectedProjects,
    updateTimelineEvents,
    isAdmin: isAdminCtx,
    isBuilder,
    isDesigner,
  } = useData();
  const isAdmin = !!isAdminCtx;
  const canEdit = isAdmin || isBuilder || isDesigner;
  const { ws } = useSocket();
  
  const [activeProject, setActiveProject] = useState(initialActiveProject);
  const [filesOpen, setFilesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  const quickLinksRef = useRef(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState(0);

  // Use budget data hook
  const { budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, refresh, loading } = useBudgetData(activeProject?.projectId);

  // Use focused business logic hooks
  const businessLogic = useBudgetBusinessLogic({
    activeProject,
    budgetHeader,
    budgetItems,
    setBudgetHeader,
    setBudgetItems,
  });

  const webSocket = useBudgetWebSocket({
    ws,
    activeProject,
    user,
    userId,
    budgetHeader,
    onBudgetUpdate: refresh,
  });

  const fileHandler = useBudgetFileHandler();

  const revisions = useBudgetRevisions({
    activeProject,
    budgetHeader,
    budgetItems,
    setBudgetHeader,
    setBudgetItems,
    onBudgetUpdate: webSocket.emitBudgetUpdate,
  });

  const modals = useBudgetModals({
    getNextElementKey: businessLogic.getNextElementKey,
    getNextElementId: businessLogic.getNextElementId,
    onLineLock: webSocket.emitLineLock,
    onLineUnlock: webSocket.emitLineUnlock,
  });

  // Layout effect for table height
  useLayoutEffect(() => {
    const updateTableHeight = () => {
      if (tableRef.current) {
        const top = tableRef.current.getBoundingClientRect().top;
        setTableHeight(window.innerHeight - top - TABLE_BOTTOM_MARGIN);
      }
    };

    updateTableHeight();
    window.addEventListener("resize", updateTableHeight);

    let resizeObserver: ResizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateTableHeight);
      resizeObserver.observe(document.body);
    }

    return () => {
      window.removeEventListener("resize", updateTableHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Project management effects
  useEffect(() => {
    setActiveProject(initialActiveProject);
  }, [initialActiveProject]);

  useEffect(() => {
    if (!initialActiveProject) return;
    if (slugify(initialActiveProject.title) !== projectSlug) {
      const proj = findProjectBySlug(projects, projectSlug);
      if (proj) {
        fetchProjectDetails(proj.projectId);
      } else {
        navigate(`/dashboard/projects/${slugify(initialActiveProject.title)}`);
      }
    }
  }, [projectSlug, projects, initialActiveProject, navigate, fetchProjectDetails]);

  // Initialize revisions when project changes
  useEffect(() => {
    if (activeProject?.projectId) {
      revisions.refreshRevisions();
    }
  }, [activeProject?.projectId, revisions]);

  // Helper functions
  const handleBack = () => {
    navigate(`/dashboard/projects/${projectSlug}`);
  };

  const parseStatusToNumber = (statusString: any) => {
    if (statusString === undefined || statusString === null) {
      return 0;
    }
    const str = typeof statusString === "string" ? statusString : String(statusString);
    const num = parseFloat(str.replace("%", ""));
    return Number.isNaN(num) ? 0 : num;
  };

  const beautifyLabel = (key: string) => {
    if (!key) return "";
    const abbreviations: Record<string, string> = { po: "PO", id: "ID", url: "URL" };
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(/\s+/)
      .map((w) => {
        const lower = w.toLowerCase();
        return abbreviations[lower] || w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  };

  const handleActiveProjectChange = (updatedProject: any) => {
    setActiveProject(updatedProject);
  };

  const handleProjectDeleted = (deletedProjectId: string) => {
    setProjects((prev: any[]) => prev.filter((p) => p.projectId !== deletedProjectId));
    setSelectedProjects((prev: any[]) =>
      prev.filter((p) => p.projectId !== deletedProjectId)
    );
    navigate("/dashboard/projects");
  };

  const handleBallparkChange = async (val: number) => {
    if (!activeProject?.projectId || !budgetHeader) return;
    try {
      await updateBudgetItem(activeProject.projectId, budgetHeader.budgetItemId, {
        headerBallPark: val,
        revision: budgetHeader.revision,
      });
      setBudgetHeader((prev: any) => (prev ? { ...prev, headerBallPark: val } : prev));
      webSocket.emitBudgetUpdate();
    } catch (err) {
      console.error('Error updating ballpark', err);
    }
  };

  const queueEventsUpdate = async (events: any[]) => {
    if (!activeProject?.projectId) return;
    try {
      setSaving(true);
      await enqueueProjectUpdate(updateTimelineEvents, activeProject.projectId, events);
    } finally {
      setSaving(false);
    }
  };

  // Event handling
  const handleSaveEvents = async (events: any[]) => {
    if (!activeProject?.projectId || !modals.eventItem) {
      modals.closeEventModal();
      return;
    }
    
    let others = Array.isArray(activeProject?.timelineEvents)
      ? activeProject.timelineEvents.filter((ev: any) => ev.budgetItemId !== modals.eventItem.budgetItemId)
      : [];
    
    const withIds = events.map((ev) => ({
      id: ev.id || uuid(),
      date: ev.date,
      hours: ev.hours,
      description: ev.description || '',
      budgetItemId: modals.eventItem.budgetItemId,
    }));
    
    const updated = [...others, ...withIds];
    
    try {
      await queueEventsUpdate(updated);
      webSocket.emitTimelineUpdate(updated);
    } catch (err) {
      console.error('Error saving events', err);
    }
    
    modals.closeEventModal();
  };

  const confirmDelete = async () => {
    if (!activeProject?.projectId || modals.deleteTargets.length === 0) {
      modals.closeDeleteModal();
      return;
    }
    
    try {
      await businessLogic.deleteLineItems(modals.deleteTargets);
      
      // Handle timeline events cleanup
      if (Array.isArray(activeProject?.timelineEvents)) {
        const remainingEvents = activeProject.timelineEvents.filter(
          (ev: any) => !modals.deleteTargets.includes(ev.budgetItemId)
        );
        if (remainingEvents.length !== activeProject.timelineEvents.length) {
          await queueEventsUpdate(remainingEvents);
          webSocket.emitTimelineUpdate(remainingEvents);
        }
      }
      
      // Clean up locked lines
      webSocket.setLockedLines((prev: string[]) => 
        prev.filter((id) => !modals.deleteTargets.includes(id))
      );
      
      // Close modal if editing item was deleted
      if (modals.deleteTargets.includes(modals.editItem?.budgetItemId)) {
        modals.closeCreateModal();
      }
    } catch (err) {
      console.error('Error deleting line items:', err);
    } finally {
      modals.closeDeleteModal();
    }
  };

  // Modal event handlers
  const handleOpenEventModal = (item: any) => {
    if (webSocket.lockedLines.includes(item.budgetItemId)) return;
    const evs = eventsByLineItem[item.budgetItemId] || [];
    modals.openEventModal(item);
    modals.setEventList(evs.map((ev: any) => ({ ...ev })));
  };

  // Table configuration
  const isDefined = (val: any) => {
    if (val === undefined || val === null) return false;
    const str = String(val).trim();
    if (!str) return false;
    const num = parseFloat(str.replace(/[$,]/g, ""));
    if (!Number.isNaN(num)) {
      return num !== 0;
    }
    return str !== "0";
  };

  const getActiveCostKey = useCallback(
    (item: any) => {
      if (isDefined(item.itemReconciledCost)) return "itemReconciledCost";
      if (isDefined(item.itemActualCost)) return "itemActualCost";
      return "itemBudgetedCost";
    },
    []
  );

  const renderPaymentStatus = (status: string) => {
    const cleaned = (status || "")
      .replace(/[·.]+$/, "")
      .trim();
    const normalizedStatus = cleaned.toUpperCase();
    const colorClass =
      normalizedStatus === "PAID"
        ? styles.paid
        : normalizedStatus === "PARTIAL"
        ? styles.partial
        : styles.unpaid;
    const display =
      normalizedStatus === "PAID" || normalizedStatus === "PARTIAL"
        ? cleaned
        : "UNPAID";
    return (
      <span className={styles.paymentStatus}>
        {display}
        <span className={`${styles.statusDot} ${colorClass}`} />
      </span>
    );
  };

  const baseColumnsOrder = [
    "elementKey",
    "elementId", 
    "description",
    "quantity",
    "unit",
    "itemBudgetedCost",
    "itemActualCost",
    "itemReconciledCost",
    "itemMarkUp",
    "itemFinalCost",
    "paymentStatus",
  ];

  const mainColumnsOrder = useMemo(
    () => businessLogic.groupBy !== "none" 
      ? [businessLogic.groupBy, ...baseColumnsOrder] 
      : baseColumnsOrder,
    [businessLogic.groupBy]
  );

  const columnHeaderMap: Record<string, string> = {
    elementKey: "Element Key",
    elementId: "Element ID", 
    category: "Category",
    areaGroup: "Area Group",
    invoiceGroup: "Invoice Group",
    description: "Description",
    quantity: "Quantity",
    unit: "Unit",
    dates: "Dates",
    itemBudgetedCost: "Budgeted Cost",
    itemActualCost: "Actual Cost", 
    itemReconciledCost: "Reconciled Cost",
    itemMarkUp: "Markup",
    itemFinalCost: "Final Cost",
    paymentStatus: "Payment Status",
  };

  const tableColumns = useMemo(() => {
    const hidden = [
      "projectId",
      "budgetItemId", 
      "budgetId",
      "title",
      "startDate",
      "endDate",
      "itemCost",
    ];
    
    const safeBudgetItems = budgetItems.filter(Boolean);
    const available = safeBudgetItems.length
      ? Array.from(
          new Set([
            ...mainColumnsOrder,
            ...safeBudgetItems.flatMap((it) => Object.keys(it)),
          ])
        ).filter((key) => !hidden.includes(key))
      : mainColumnsOrder;
      
    const costKeys = [
      "itemBudgetedCost",
      "itemActualCost", 
      "itemReconciledCost",
      "itemFinalCost",
    ];
    
    const allIds = safeBudgetItems.map((it) => it.budgetItemId);
    
    const cols = mainColumnsOrder
      .map((key) => {
        if (available.includes(key)) {
          const base: any = {
            title: columnHeaderMap[key] || key,
            dataIndex: key,
            key,
            sorter: () => 0,
            sortOrder: businessLogic.sortField === key ? businessLogic.sortOrder : null,
          };
          
          if (key === "elementKey") {
            base.title = (
              <span className={styles.elementKeyCell}>
                <input
                  type="checkbox"
                  checked={
                    allIds.length > 0 && businessLogic.selectedRowKeys.length === allIds.length
                  }
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        businessLogic.selectedRowKeys.length > 0 &&
                        businessLogic.selectedRowKeys.length < allIds.length;
                    }
                  }}
                  onChange={(e) => {
                    const { checked } = e.target;
                    businessLogic.setSelectedRowKeys(checked ? allIds : []);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ marginLeft: "15px" }}>{columnHeaderMap[key]}</span>
              </span>
            );
            base.render = (value: any, record: any) => (
              <span className={styles.elementKeyCell}>
                <input
                  type="checkbox"
                  checked={businessLogic.selectedRowKeys.includes(record.budgetItemId)}
                  onChange={(e) => {
                    const { checked } = e.target;
                    businessLogic.setSelectedRowKeys((prev: string[]) => {
                      if (checked) {
                        return Array.from(new Set([...prev, record.budgetItemId]));
                      }
                      return prev.filter((k) => k !== record.budgetItemId);
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ marginLeft: "15px" }}>{value}</span>
              </span>
            );
          }
          
          if (key === "paymentStatus") {
            base.align = "right";
            base.render = renderPaymentStatus;
          } else if (key === "itemMarkUp") {
            base.render = (value: any) =>
              typeof value === "number" ? `${Math.round(value * 100)}%` : value;
          } else if (costKeys.includes(key)) {
            base.render = (value: any, record: any) => {
              if (!isDefined(value)) return "";
              if (key === "itemFinalCost") {
                return <span>{formatUSD(value)}</span>;
              }
              const activeKey = getActiveCostKey(record);
              const className = activeKey === key ? undefined : styles.dimmed;
              return <span className={className}>{formatUSD(value)}</span>;
            };
          }
          
          if (businessLogic.groupBy !== "none" && key === businessLogic.groupBy) {
            base.className = styles.groupColumn;
            const origRender = base.render;
            base.render = (value: any, record: any, index: number) => {
              const span = record[`${businessLogic.groupBy}RowSpan`];
              const children = origRender
                ? origRender(value, record, index)
                : value;
              return { children, props: { rowSpan: span } };
            };
          }
          
          return base;
        }
        return null;
      })
      .filter(Boolean);

    // Add events column
    cols.push({
      title: "",
      key: "events",
      align: "center",
      render: (_v: any, record: any) => {
        const events = eventsByLineItem[record.budgetItemId] || [];
        const count = events.length;
        const tooltipContent = events.length
          ? (
              <div>
                {events.map((ev: any, i: number) => (
                  <div key={i}>
                    {new Date(ev.date).toLocaleDateString()} - {ev.hours} hrs
                    {ev.description ? ` - ${ev.description}` : ""}
                  </div>
                ))}
              </div>
            )
          : "No events";
        return (
          <AntTooltip title={tooltipContent} placement="top">
            <button
              className={styles.calendarButton}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEventModal(record);
              }}
              aria-label="Manage events"
            >
              <FontAwesomeIcon icon={faClock} />
              {count > 0 && <span className={styles.eventBadge}>{count}</span>}
            </button>
          </AntTooltip>
        );
      },
      width: 40,
    });

    // Add actions column
    cols.push({
      title: "",
      key: "actions",
      align: "center",
      render: (_value: any, record: any) => (
        <div className={styles.actionButtons}>
          <button
            className={styles.duplicateButton}
            onClick={(e) => {
              e.stopPropagation();
              modals.openDuplicateModal(record);
            }}
            aria-label="Duplicate line item"
          >
            <FontAwesomeIcon icon={faClone} />
          </button>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              modals.openDeleteModal([record.budgetItemId]);
            }}
            aria-label="Delete line item"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      ),
      width: 60,
    });
    
    return cols;
  }, [
    budgetItems,
    businessLogic.groupBy,
    mainColumnsOrder,
    businessLogic.sortField,
    businessLogic.sortOrder,
    businessLogic.selectedRowKeys,
    eventsByLineItem,
  ]);

  const tableData = useMemo(
    () =>
      budgetItems.map((item) => ({
        ...item,
        key: item.budgetItemId,
      })),
    [budgetItems]
  );

  const sortedTableData = useMemo(() => {
    const compareValues = (a: any, b: any) => {
      if (a === b) return 0;
      if (a === undefined || a === null) return -1;
      if (b === undefined || b === null) return 1;
      if (typeof a === "number" && typeof b === "number") {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    };

    const data = tableData.slice();

    data.sort((a, b) => {
      if (businessLogic.groupBy !== "none") {
        const groupComp = compareValues(a[businessLogic.groupBy], b[businessLogic.groupBy]);
        if (groupComp !== 0) {
          if (businessLogic.sortField === businessLogic.groupBy && businessLogic.sortOrder === "descend") {
            return -groupComp;
          }
          return groupComp;
        }
      }

      if (businessLogic.sortField && businessLogic.sortField !== businessLogic.groupBy) {
        const fieldComp = compareValues(a[businessLogic.sortField], b[businessLogic.sortField]);
        return businessLogic.sortOrder === "descend" ? -fieldComp : fieldComp;
      }

      return 0;
    });

    return data;
  }, [tableData, businessLogic.groupBy, businessLogic.sortField, businessLogic.sortOrder]);

  const groupedTableData = useMemo(() => {
    if (businessLogic.groupBy === "none") {
      return sortedTableData.map((row) => ({ ...row }));
    }

    const result: any[] = [];
    let i = 0;

    while (i < sortedTableData.length) {
      const current = sortedTableData[i][businessLogic.groupBy];
      let j = i + 1;
      while (j < sortedTableData.length && sortedTableData[j][businessLogic.groupBy] === current) {
        j++;
      }

      const groupRows = sortedTableData.slice(i, j);
      const expandedCount = groupRows.filter((r) => expandedRowKeys.includes(r.key)).length;
      const span = groupRows.length + expandedCount;

      for (let k = i; k < j; k++) {
        const row = { ...sortedTableData[k] };
        row[`${businessLogic.groupBy}RowSpan`] = k === i ? span : 0;
        result.push(row);
      }

      i = j;
    }

    return result;
  }, [sortedTableData, businessLogic.groupBy, expandedRowKeys]);

  const detailOrder = [
    "paymentTerms",
    "paymentType", 
    null,
    "vendor",
    "vendorInvoiceNumber",
    "poNumber",
    null,
    "client",
    "amountPaid",
    "balanceDue",
    null,
    "areaGroup",
    "invoiceGroup", 
    "category",
  ];

  const expandedRowRender = useCallback(
    (record: any) => {
      const notes = record.notes;
      return (
        <table>
          <tbody>
            {(record.startDate || record.endDate) && (
              <tr key="dates">
                <td style={{ fontWeight: "bold", paddingRight: "8px" }}>Dates</td>
                <td style={{ textAlign: "right" }}>
                  {`${record.startDate || ""}${
                    record.endDate ? ` - ${record.endDate}` : ""
                  }`}
                </td>
              </tr>
            )}
            {detailOrder.map((key, idx) =>
              key === null ? (
                <tr key={`hr-${idx}`}>
                  <td colSpan={2}>
                    <hr style={{ margin: "8px 0", borderColor: "#444" }} />
                  </td>
                </tr>
              ) : (
                <tr key={key}>
                  <td style={{ fontWeight: "bold", paddingRight: "8px" }}>
                    {beautifyLabel(key)}
                  </td>
                  <td style={{ textAlign: "right" }}>{String(record[key] ?? "")}</td>
                </tr>
              )
            )}
            <tr key="notes-divider">
              <td colSpan={2}>
                <hr style={{ margin: "8px 0", borderColor: "#444" }} />
              </td>
            </tr>
            <tr key="notes">
              <td style={{ fontWeight: "bold", paddingRight: "8px" }}>Notes</td>
              <td
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 3,
                  color: notes ? "inherit" : "#888",
                  textAlign: "right",
                }}
              >
                {notes || "No notes available"}
              </td>
            </tr>
          </tbody>
        </table>
      );
    },
    [beautifyLabel]
  );

  // Access control
  if (!isAdmin) {
    return <div>Access Denied</div>;
  }

  return (
    <>
      <style>{`
        :where(.ant-table-wrapper) .ant-table {
          font-size: 11px !important;
        }
      `}</style>
      <ProjectPageLayout
        projectId={activeProject?.projectId}
        header={
          <ProjectHeader
            activeProject={activeProject}
            parseStatusToNumber={parseStatusToNumber}
            userId={userId}
            onProjectDeleted={handleProjectDeleted}
            showWelcomeScreen={handleBack}
            onActiveProjectChange={handleActiveProjectChange}
            onOpenFiles={() => setFilesOpen(true)}
            onOpenQuickLinks={() => quickLinksRef.current?.openModal()}
          />
        }
      >
        {saving && (
          <div style={{ color: '#FA3356', marginBottom: '10px' }}>Saving...</div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="budget-layout">
              <QuickLinksComponent ref={quickLinksRef} hideTrigger={true} />
              
              <FileManagerComponent
                isOpen={filesOpen}
                onRequestClose={() => setFilesOpen(false)}
                showTrigger={false}
                folder="uploads"
              />
              
              <BudgetHeader
                activeProject={activeProject}
                budgetHeader={budgetHeader}
                budgetItems={budgetItems}
                groupBy={businessLogic.groupBy}
                setGroupBy={businessLogic.setGroupBy}
                onOpenRevisionModal={modals.openRevisionModal}
                onBallparkChange={handleBallparkChange}
              />
              
              <BudgetModals
                // Modal states
                isBudgetModalOpen={modals.isBudgetModalOpen}
                isRevisionModalOpen={modals.isRevisionModalOpen}
                isCreateModalOpen={modals.isCreateModalOpen}
                isEventModalOpen={modals.isEventModalOpen}
                isConfirmingDelete={modals.isConfirmingDelete}
                
                // Modal data
                editItem={modals.editItem}
                prefillItem={modals.prefillItem}
                eventItem={modals.eventItem}
                eventList={modals.eventList}
                deleteTargets={modals.deleteTargets}
                nextElementKey={modals.nextElementKey}
                
                // Budget data
                budgetHeader={budgetHeader}
                budgetItems={budgetItems}
                areaGroups={businessLogic.areaGroups}
                invoiceGroups={businessLogic.invoiceGroups}
                clients={businessLogic.clients}
                revisions={revisions.revisions}
                activeProject={activeProject}
                eventDescOptions={eventDescOptions}
                
                // Modal handlers
                closeBudgetModal={modals.closeBudgetModal}
                closeRevisionModal={modals.closeRevisionModal}
                closeCreateModal={modals.closeCreateModal}
                closeEventModal={modals.closeEventModal}
                closeDeleteModal={modals.closeDeleteModal}
                
                // Action handlers
                onFileSelected={fileHandler.parseFile}
                onCreateLineItem={handleCreateLineItem}
                onEditLineItem={handleEditLineItem}
                onSaveEvents={handleSaveEvents}
                onConfirmDelete={confirmDelete}
                onSwitchRevision={revisions.handleSwitchRevision}
                onDuplicateRevision={(rev) => revisions.handleNewRevision(true, rev)}
                onCreateNewRevision={() => revisions.handleNewRevision(false)}
                onDeleteRevision={(rev) => revisions.handleDeleteRevision(rev.revision)}
                onSetClientRevision={(rev) => revisions.handleSetClientRevision(rev)}
                
                // Permissions
                canEdit={canEdit}
              />
              
              <div style={{ padding: "0 20px" }}>
                <div>
                  {fileHandler.error && (
                    <div style={{ marginTop: "10px", color: "#ff6b6b" }}>
                      Error: {fileHandler.error}
                    </div>
                  )}
                  
                  {fileHandler.budgetData.length > 0 && (
                    <BudgetChart data={fileHandler.budgetData} />
                  )}
                  
                  <div
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <BudgetToolbar
                      groupBy={businessLogic.groupBy}
                      onGroupChange={(val) => businessLogic.setGroupBy(val as string)}
                      selectedRowKeys={businessLogic.selectedRowKeys}
                      handleDuplicateSelected={() => businessLogic.duplicateLineItems(businessLogic.selectedRowKeys)}
                      openDeleteModal={modals.openDeleteModal}
                      undoStackLength={businessLogic.undoStack.length}
                      redoStackLength={businessLogic.redoStack.length}
                      handleUndo={businessLogic.handleUndo}
                      handleRedo={businessLogic.handleRedo}
                      openCreateModal={modals.openCreateModal}
                    />
                    
                    <BudgetItemsTable
                      dataSource={budgetItems.length > 0 ? groupedTableData : []}
                      columns={tableColumns}
                      groupBy={businessLogic.groupBy}
                      selectedRowKeys={businessLogic.selectedRowKeys}
                      lockedLines={webSocket.lockedLines}
                      handleTableChange={handleTableChange}
                      openEditModal={modals.openEditModal}
                      openDeleteModal={modals.openDeleteModal}
                      expandedRowRender={expandedRowRender}
                      expandedRowKeys={expandedRowKeys}
                      setExpandedRowKeys={setExpandedRowKeys}
                      tableRef={tableRef}
                      tableHeight={tableHeight}
                      pageSize={pageSize}
                      currentPage={currentPage}
                      setCurrentPage={setCurrentPage}
                      setPageSize={setPageSize}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </ProjectPageLayout>
    </>
  );
};

export default BudgetPage;
