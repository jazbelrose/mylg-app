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
import { Table, Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faClone,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import ConfirmModal from "../../components/ConfirmModal";
import * as ExcelJS from "exceljs";
import styles from "./BudgetPage.module.css";

import ProjectPageLayout from "./components/SingleProject/ProjectPageLayout";
import ProjectHeader from "./components/SingleProject/ProjectHeader";
import QuickLinksComponent from "./components/SingleProject/QuickLinksComponent";
import FileManagerComponent from "./components/SingleProject/FileManager";
import BudgetHeader from "./components/SingleProject/BudgetHeader";
import BudgetFileModal from "./components/SingleProject/BudgetFileModal";
import CreateLineItemModal from "./components/SingleProject/CreateLineItemModal";
import EventEditModal from "./components/SingleProject/EventEditModal";
import RevisionModal from "./components/SingleProject/RevisionModal";
import BudgetChart from "./components/SingleProject/BudgetChart";
import BudgetToolbar from "./components/SingleProject/BudgetToolbar";
import BudgetItemsTable from "./components/SingleProject/BudgetItemsTable";
import { BudgetProvider, useBudget } from "./components/SingleProject/BudgetDataProvider";
import { useBudgetHeaderManager } from "./components/SingleProject/BudgetHeaderManager";
import { useBudgetItemsManager } from "./components/SingleProject/BudgetItemsManager";
import { useBudgetEventsManager } from "./components/SingleProject/BudgetEventsManager";
import { useBudgetTableManager } from "./components/SingleProject/BudgetTableManager";
import { useBudgetSocketManager } from "./components/SingleProject/BudgetSocketManager";
import { useBudgetModalsManager } from "./components/SingleProject/BudgetModalsManager";
import { useData } from "../../app/contexts/DataProvider";
import { findProjectBySlug, slugify } from "../../utils/slug";
import { formatUSD } from "../../utils/budgetUtils";
import {
  fetchBudgetHeaders,
  updateBudgetItem,
} from "../../utils/api";
import { enqueueProjectUpdate } from "../../utils/requestQueue";

const TABLE_HEADER_FOOTER = 110;
const TABLE_BOTTOM_MARGIN = 20;

const BudgetPageContent = () => {
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
  
  const [activeProject, setActiveProject] = useState(initialActiveProject);
  const [filesOpen, setFilesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [areaGroups, setAreaGroups] = useState([]);
  const [invoiceGroups, setInvoiceGroups] = useState([]);
  const [clients, setClients] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [error, setError] = useState(null);

  const quickLinksRef = useRef(null);
  const tableRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(0);

  const { budgetHeader, budgetItems, setBudgetHeader, refresh } = useBudget();


  // Initialize managers and hooks
  const {
    lockedLines,
    editingLineId,
    setEditingLineId,
    emitBudgetUpdate,
    emitLineLock,
    emitLineUnlock,
    emitTimelineUpdate,
  } = useBudgetSocketManager({
    activeProject,
    budgetHeader,
    user,
    userId,
    refresh,
  });

  const {
    groupBy,
    setGroupBy,
    expandedRowKeys,
    setExpandedRowKeys,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    groupedTableData,
    handleTableChange,
  } = useBudgetTableManager(budgetItems);

  const {
    isCreateModalOpen,
    editItem,
    prefillItem,
    nextElementKey,
    isRevisionModalOpen,
    isBudgetModalOpen,
    setBudgetModalOpen,
    isConfirmingDelete,
    selectedRowKeys,
    setSelectedRowKeys,
    openCreateModal,
    openEditModal,
    openDuplicateModal,
    closeCreateModal,
    openRevisionModal,
    closeRevisionModal,
    closeBudgetModal,
    openDeleteModal,
    confirmDelete,
  } = useBudgetModalsManager();

  const queueEventsUpdate = async (events) => {
    if (!activeProject?.projectId) return;
    try {
      setSaving(true);
      await enqueueProjectUpdate(updateTimelineEvents, activeProject.projectId, events);
    } finally {
      setSaving(false);
    }
  };

  const {
    undoStack,
    redoStack,
    getNextElementKey,
    getNextElementId,
    handleCreateLineItem,
    handleEditLineItem,
    handleDuplicateSelected,
    handleDeleteItems,
    handleUndo,
    handleRedo,
  } = useBudgetItemsManager({
    activeProject,
    areaGroups,
    setAreaGroups,
    invoiceGroups,
    setInvoiceGroups,
    clients,
    setClients,
    syncHeaderTotals,
    emitBudgetUpdate,
    updateTimelineEvents,
    queueEventsUpdate,
    emitTimelineUpdate,
  });

  const {
    handleBallparkChange,
    handleNewRevision,
    handleSwitchRevision,
    handleDeleteRevision,
    handleSetClientRevision,
  } = useBudgetHeaderManager({
    activeProject,
    revisions,
    setRevisions,
    emitBudgetUpdate,
  });

  const {
    isEventModalOpen,
    eventItem,
    eventList,
    openEventModal,
    closeEventModal,
    handleSaveEvents,
  } = useBudgetEventsManager({
    activeProject,
    queueEventsUpdate,
    emitTimelineUpdate,
  });

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
  }, [
    projectSlug,
    projects,
    initialActiveProject,
    navigate,
    fetchProjectDetails,
  ]);

  useEffect(() => {
    const loadRevisions = async () => {
      if (!activeProject?.projectId) return;
      try {
        const revs = await fetchBudgetHeaders(activeProject.projectId);
        setRevisions(revs);
      } catch (err) {
        console.error("Error fetching budget headers", err);
      }
    };
    loadRevisions();
  }, [activeProject?.projectId]);

  useEffect(() => {
    if (budgetItems.length > 0 && budgetHeader) {
      computeGroupsAndClients(budgetItems, budgetHeader);
    }
  }, [budgetItems, budgetHeader, computeGroupsAndClients]);

  const handleBack = () => {
    navigate(`/dashboard/projects/${projectSlug}`);
  };

  const handleActiveProjectChange = (updatedProject) => {
    setActiveProject(updatedProject);
  };

  const handleProjectDeleted = (deletedProjectId) => {
    setProjects((prev) => prev.filter((p) => p.projectId !== deletedProjectId));
    setSelectedProjects((prev) =>
      prev.filter((p) => p.projectId !== deletedProjectId)
    );
    navigate("/dashboard/projects");
  };

  // Event-related computed values
  const eventsByLineItem = useMemo(() => {
    const map = {};
    if (Array.isArray(activeProject?.timelineEvents)) {
      activeProject.timelineEvents.forEach((ev) => {
        if (ev.budgetItemId) {
          if (!map[ev.budgetItemId]) map[ev.budgetItemId] = [];
          map[ev.budgetItemId].push(ev);
        }
      });
    }
    return map;
  }, [activeProject]);

  const eventDescOptions = useMemo(() => {
    const set = new Set();
    if (Array.isArray(activeProject?.timelineEvents)) {
      activeProject.timelineEvents.forEach((ev) => {
        const desc = (ev.description || '').trim().toUpperCase();
        if (desc) set.add(desc);
      });
    }
    return Array.from(set);
  }, [activeProject]);

  // Table configuration
  const isDefined = (val) => {
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
    (item) => {
      if (isDefined(item.itemReconciledCost)) return "itemReconciledCost";
      if (isDefined(item.itemActualCost)) return "itemActualCost";
      return "itemBudgetedCost";
    },
    []
  );

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
    () =>
      groupBy !== "none" ? [groupBy, ...baseColumnsOrder] : baseColumnsOrder,
    [groupBy]
  );

  const columnHeaderMap = {
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

  const renderPaymentStatus = (status) => {
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
        if (key === "dates") {
          return {
            title: columnHeaderMap[key],
            dataIndex: "dates",
            key: "dates",
          };
        }
        if (available.includes(key)) {
          const base = {
            title: columnHeaderMap[key] || key,
            dataIndex: key,
            key,
            sorter: () => 0,
            sortOrder: handleTableChange.sortField === key ? handleTableChange.sortOrder : null,
          };
          if (key === "elementKey") {
            base.title = (
              <span className={styles.elementKeyCell}>
                <input
                  type="checkbox"
                  checked={
                    allIds.length > 0 && selectedRowKeys.length === allIds.length
                  }
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        selectedRowKeys.length > 0 &&
                        selectedRowKeys.length < allIds.length;
                    }
                  }}
                  onChange={(e) => {
                    const { checked } = e.target;
                    setSelectedRowKeys(checked ? allIds : []);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ marginLeft: "15px" }}>{columnHeaderMap[key]}</span>
              </span>
            );
            base.render = (value, record) => (
              <span className={styles.elementKeyCell}>
                <input
                  type="checkbox"
                  checked={selectedRowKeys.includes(record.budgetItemId)}
                  onChange={(e) => {
                    const { checked } = e.target;
                    setSelectedRowKeys((prev) => {
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
            base.render = (value) =>
              typeof value === "number" ? `${Math.round(value * 100)}%` : value;
          } else if (costKeys.includes(key)) {
            base.render = (value, record) => {
              if (!isDefined(value)) return "";
              if (key === "itemFinalCost") {
                return <span>{formatUSD(value)}</span>;
              }
              const activeKey = getActiveCostKey(record);
              const className = activeKey === key ? undefined : styles.dimmed;
              return <span className={className}>{formatUSD(value)}</span>;
            };
          }
          if (groupBy !== "none" && key === groupBy) {
            base.className = styles.groupColumn;
            const origRender = base.render;
            base.render = (value, record, index) => {
              const span = record[`${groupBy}RowSpan`];
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

    cols.push({
      title: "",
      key: "events",
      align: "center",
      render: (_v, record) => {
        const events = eventsByLineItem[record.budgetItemId] || [];
        const count = events.length;
        const tooltipContent = events.length
          ? (
              <div>
                {events.map((ev, i) => (
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
                openEventModal(record, eventsByLineItem, lockedLines);
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

    cols.push({
      title: "",
      key: "actions",
      align: "center",
      render: (_value, record) => (
        <div className={styles.actionButtons}>
          <button
            className={styles.duplicateButton}
            onClick={(e) => {
              e.stopPropagation();
              openDuplicateModal(record, getNextElementKey, getNextElementId);
            }}
            aria-label="Duplicate line item"
          >
            <FontAwesomeIcon icon={faClone} />
          </button>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal([record.budgetItemId]);
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
    groupBy,
    mainColumnsOrder,
    selectedRowKeys,
    eventsByLineItem,
    getActiveCostKey,
    openEventModal,
    openDuplicateModal,
    openDeleteModal,
    getNextElementKey,
    getNextElementId,
    lockedLines,
  ]);

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
    (record) => {
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

  // File parsing for budget visualization
  const parseFile = async (file) => {
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      
      const worksheet = workbook.worksheets[0];
      const json = [];
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 12) {
          const rowData = [];
          row.eachCell((cell, colNumber) => {
            rowData[colNumber - 1] = cell.value || "";
          });
          json.push(rowData);
        }
      });
      
      const [headers, ...rows] = json;
      const idxCategory = headers.findIndex(
        (h) => /element description/i.test(h) || /category/i.test(h)
      );
      const idxAmount = headers.findIndex(
        (h) =>
          /final total/i.test(h) || /amount/i.test(h) || /value|cost/i.test(h)
      );
      if (idxCategory < 0 || idxAmount < 0) {
        throw new Error(
          'Could not find "Element Description" and "Final Total" columns.'
        );
      }
      const formatted = rows
        .map((row) => ({
          category: row[idxCategory],
          amount: parseFloat(row[idxAmount]) || 0,
        }))
        .filter((r) => r.category && r.amount > 0);

      setBudgetData(formatted);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(
        'Failed to parse Excel file. Ensure it includes headers like "Element Description" and "Final Total" at row 12.'
      );
    }
  };

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
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        onOpenRevisionModal={openRevisionModal}
        onBallparkChange={handleBallparkChange}
      />
      <BudgetFileModal
        isOpen={isBudgetModalOpen}
        onRequestClose={closeBudgetModal}
        onFileSelected={parseFile}
      />
      <RevisionModal
        isOpen={isRevisionModalOpen}
        onRequestClose={closeRevisionModal}
        revisions={revisions}
        activeRevision={budgetHeader?.revision}
        onSwitch={handleSwitchRevision}
        onDuplicate={(rev) => handleNewRevision(true, rev)}
        onCreateNew={() => handleNewRevision(false)}
        onDelete={(rev) => handleDeleteRevision(rev.revision)}
        onSetClient={(rev) => handleSetClientRevision(rev)}
        isAdmin={canEdit}
        activeProject={activeProject}
      />
      <CreateLineItemModal
        isOpen={isCreateModalOpen}
        onRequestClose={closeCreateModal}
        onSubmit={(d, isAutoSave) =>
          editItem
            ? handleEditLineItem(d, isAutoSave)
            : handleCreateLineItem(d, isAutoSave)
        }
        defaultElementKey={nextElementKey}
        budgetItems={budgetItems}
        areaGroupOptions={areaGroups}
        invoiceGroupOptions={invoiceGroups}
        clientOptions={clients}
        defaultStartDate={budgetHeader?.startDate || ''}
        defaultEndDate={budgetHeader?.endDate || ''}
        initialData={prefillItem || editItem}
        title={editItem ? 'Edit Item' : 'Create Line Item'}
        revision={budgetHeader?.revision || 1}
      />
      <EventEditModal
        isOpen={isEventModalOpen}
        onRequestClose={closeEventModal}
        events={eventList}
        defaultDate={budgetHeader?.startDate || ''}
        defaultDescription={eventItem?.description || ''}
        descOptions={eventDescOptions}
        onSubmit={handleSaveEvents}
      />
      <ConfirmModal
        isOpen={isConfirmingDelete}
        onRequestClose={() => setIsConfirmingDelete(false)}
        onConfirm={confirmDelete}
        message="Delete selected line item(s)?"
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.modalOverlay,
          afterOpen: styles.modalOverlayAfterOpen,
          beforeClose: styles.modalOverlayBeforeClose,
        }}
      />
      <div style={{ padding: "0 20px" }}>
        <div>
          {error && (
            <div style={{ marginTop: "10px", color: "#ff6b6b" }}>
              Error: {error}
            </div>
          )}
          {budgetData.length > 0 && <BudgetChart data={budgetData} />}
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
              groupBy={groupBy}
              onGroupChange={(val) => setGroupBy(val as string)}
              selectedRowKeys={selectedRowKeys}
              handleDuplicateSelected={handleDuplicateSelected}
              openDeleteModal={openDeleteModal}
              undoStackLength={undoStack.length}
              redoStackLength={redoStack.length}
              handleUndo={handleUndo}
              handleRedo={handleRedo}
              openCreateModal={openCreateModal}
            />
            <BudgetItemsTable
              dataSource={budgetItems.length > 0 ? groupedTableData : []}
              columns={tableColumns}
              groupBy={groupBy}
              selectedRowKeys={selectedRowKeys}
              lockedLines={lockedLines}
              handleTableChange={handleTableChange}
              openEditModal={openEditModal}
              openDeleteModal={openDeleteModal}
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

const BudgetPage = () => {
  const { projectSlug } = useParams();
  const {
    activeProject: initialActiveProject,
    projects,
  } = useData();
  const [activeProject, setActiveProject] = useState(initialActiveProject);

  useEffect(() => {
    setActiveProject(initialActiveProject);
  }, [initialActiveProject]);

  useEffect(() => {
    if (!initialActiveProject) return;
    if (slugify(initialActiveProject.title) !== projectSlug) {
      const proj = findProjectBySlug(projects, projectSlug);
      if (proj) {
        setActiveProject(proj);
      }
    }
  }, [projectSlug, projects, initialActiveProject]);

  return (
    <BudgetProvider projectId={activeProject?.projectId}>
      <BudgetPageContent />
    </BudgetProvider>
  );
};