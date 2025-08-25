import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { AnimatePresence, motion } from "framer-motion";
import ProjectPageLayout from "./ProjectPageLayout";
import ProjectHeader from "./ProjectHeader";
import QuickLinksComponent from "./QuickLinksComponent";
import FileManagerComponent from "./FileManager";
import BudgetHeader from "./BudgetHeader";
import BudgetChart from "./BudgetChart";
import BudgetToolbar from "./BudgetToolbar";
import BudgetTableContainer from "./BudgetTableContainer";
import BudgetModalsContainer, { useBudgetModals } from "./BudgetModalsContainer";
import BudgetOperationsProvider, { useBudgetOperations } from "./BudgetOperationsProvider";
import { BudgetProvider, useBudget } from "./BudgetDataProvider";
import styles from "../../BudgetPage.module.css";
import { useData } from "../../../../app/contexts/DataProvider";
import { useSocket } from "../../../../app/contexts/SocketContext";
import { normalizeMessage } from "../../../../utils/websocketUtils";
import { findProjectBySlug, slugify } from "../../../../utils/slug";
import { formatUSD } from "../../../../utils/budgetUtils";
import {
  fetchBudgetHeaders,
  createBudgetItem,
  updateBudgetItem,
  fetchBudgetItems,
  deleteBudgetItem,
} from "../../../../utils/api";
import { enqueueProjectUpdate } from "../../../../utils/requestQueue";
import type { BudgetLine, BudgetHeader as BudgetHeaderType } from "../../../../utils/api";

const BudgetPageContent: React.FC = () => {
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
  
  // Budget data from provider
  const { budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, refresh, loading } = useBudget();
  
  // Local state
  const [activeProject, setActiveProject] = useState(initialActiveProject);
  const [filesOpen, setFilesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<BudgetHeaderType[]>([]);
  const [areaGroups, setAreaGroups] = useState<string[]>([]);
  const [invoiceGroups, setInvoiceGroups] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [lockedLines, setLockedLines] = useState<string[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState("invoiceGroup");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal and form state
  const [prefillItem, setPrefillItem] = useState<BudgetLine | null>(null);
  const [editItem, setEditItem] = useState<BudgetLine | null>(null);
  const [eventItem, setEventItem] = useState<BudgetLine | null>(null);
  
  // Modal controls
  const modalControls = useBudgetModals();
  
  // Budget operations
  const {
    handleCreateLineItem,
    handleEditLineItem,
    handleDuplicateSelected,
    confirmDelete,
    handleBallparkChange,
    syncHeaderTotals,
    handleUndo,
    handleRedo,
    undoStackLength,
    redoStackLength,
  } = useBudgetOperations();

  // Refs and layout
  const quickLinksRef = React.useRef(null);
  const tableRef = React.useRef(null);
  const [tableHeight, setTableHeight] = useState(0);

  // Initialize project and fetch data
  useEffect(() => {
    const initializeProject = async () => {
      if (!projectSlug) return;
      
      let project = initialActiveProject;
      if (!project || slugify(project.title) !== projectSlug) {
        project = findProjectBySlug(projects, projectSlug);
        if (!project) {
          navigate("/dashboard");
          return;
        }
        setActiveProject(project);
      }
      
      if (project?.projectId) {
        try {
          const headers = await fetchBudgetHeaders(project.projectId);
          setRevisions(headers);
        } catch (err) {
          console.error("Error fetching budget headers:", err);
        }
      }
    };
    
    initializeProject();
  }, [projectSlug, initialActiveProject, projects, navigate]);

  // Update derived data when budget data changes
  useEffect(() => {
    if (budgetItems.length > 0) {
      const areas = Array.from(new Set(budgetItems.map(item => item.areaGroup).filter(Boolean)));
      const invoices = Array.from(new Set(budgetItems.map(item => item.invoiceGroup).filter(Boolean)));
      setAreaGroups(areas);
      setInvoiceGroups(invoices);
    }
    
    if (budgetHeader?.clients) {
      setClients(budgetHeader.clients);
    }
  }, [budgetItems, budgetHeader]);

  // Event handlers
  const handleActiveProjectChange = useCallback((project: any) => {
    setActiveProject(project);
    navigate(`/dashboard/budget/${slugify(project.title)}`);
  }, [navigate]);

  const handleProjectDeleted = useCallback((deletedId: string) => {
    setProjects(prev => prev.filter(p => p.projectId !== deletedId));
    setSelectedProjects(prev => prev.filter(id => id !== deletedId));
    navigate("/dashboard");
  }, [setProjects, setSelectedProjects, navigate]);

  const handleBack = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // Table column configuration
  const mainColumnsOrder = [
    "elementKey",
    "elementId", 
    "areaGroup",
    "invoiceGroup",
    "category",
    "description",
    "quantity",
    "unit",
    "unitCost",
    "itemBudgetedTotalCost",
    "itemActualTotalCost",
    "itemFinalCost",
    "itemMarkUp",
    "client",
    "vendor",
    "paymentStatus",
  ];

  // Parse status function
  const parseStatusToNumber = useCallback((status: string) => {
    const statusMap: Record<string, number> = {
      "planning": 0,
      "in-progress": 1,
      "review": 2,
      "completed": 3,
    };
    return statusMap[status?.toLowerCase()] ?? 0;
  }, []);

  // Event data processing
  const eventList = useMemo(() => {
    return activeProject?.timelineEvents?.filter((ev: any) => 
      ev.budgetItemId === eventItem?.budgetItemId
    ) || [];
  }, [activeProject?.timelineEvents, eventItem?.budgetItemId]);

  const eventsByLineItem = useMemo(() => {
    if (!activeProject?.timelineEvents) return {};
    return activeProject.timelineEvents.reduce((acc: Record<string, any[]>, event: any) => {
      if (event.budgetItemId) {
        if (!acc[event.budgetItemId]) acc[event.budgetItemId] = [];
        acc[event.budgetItemId].push(event);
      }
      return acc;
    }, {});
  }, [activeProject?.timelineEvents]);

  const eventDescOptions = useMemo(() => {
    const descriptions = budgetItems.map(item => item.description).filter(Boolean);
    return Array.from(new Set(descriptions));
  }, [budgetItems]);

  // Next element key calculation
  const nextElementKey = useMemo(() => {
    if (!activeProject?.title) return "";
    const slug = slugify(activeProject.title);
    let maxKey = 0;
    budgetItems.forEach(item => {
      if (typeof item.elementKey === "string") {
        const match = item.elementKey.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxKey) maxKey = num;
        }
      }
    });
    return `${slug}-${String(maxKey + 1).padStart(4, "0")}`;
  }, [activeProject?.title, budgetItems]);

  // Budget chart data
  const budgetData = useMemo(() => {
    if (!budgetHeader) return [];
    return [
      { name: "Ballpark", value: budgetHeader.headerBallPark || 0 },
      { name: "Budgeted", value: budgetHeader.headerBudgetedTotalCost || 0 },
      { name: "Actual", value: budgetHeader.headerActualTotalCost || 0 },
      { name: "Final", value: budgetHeader.headerFinalTotalCost || 0 },
    ].filter(item => item.value > 0);
  }, [budgetHeader]);

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setEditItem(null);
    setPrefillItem(null);
    modalControls.openCreateModal();
  }, [modalControls]);

  const openEditModal = useCallback((item: BudgetLine) => {
    setEditItem(item);
    setPrefillItem(null);
    modalControls.openCreateModal();
  }, [modalControls]);

  const openDuplicateModal = useCallback((item: BudgetLine) => {
    setEditItem(null);
    setPrefillItem(item);
    modalControls.openCreateModal();
  }, [modalControls]);

  const openDeleteModal = useCallback((ids: string[]) => {
    setDeleteTargets(ids);
    modalControls.openConfirmModal();
  }, [modalControls]);

  const openEventModal = useCallback((item: BudgetLine) => {
    setEventItem(item);
    modalControls.openEventModal();
  }, [modalControls]);

  const handleTableSort = useCallback((field: string | null, order: string | null) => {
    setSortField(field);
    setSortOrder(order);
  }, []);

  const handleDuplicateSelectedRows = useCallback(async () => {
    await handleDuplicateSelected(selectedRowKeys);
  }, [handleDuplicateSelected, selectedRowKeys]);

  const handleConfirmDelete = useCallback(async () => {
    await confirmDelete(deleteTargets);
    setDeleteTargets([]);
  }, [confirmDelete, deleteTargets]);

  // Save events handler
  const handleSaveEvents = useCallback(async (events: any[]) => {
    if (!activeProject?.projectId) return;
    
    const projectUpdate = {
      projectId: activeProject.projectId,
      timelineEvents: events,
    };
    
    await enqueueProjectUpdate(projectUpdate);
    updateTimelineEvents(events);
    
    window.dispatchEvent(
      new CustomEvent("budgetUpdated", {
        detail: { projectId: activeProject.projectId },
      })
    );
  }, [activeProject?.projectId, updateTimelineEvents]);

  // Revision handlers
  const handleSwitchRevision = useCallback(async (revision: number) => {
    // Implementation for switching revision
    console.log("Switch to revision:", revision);
  }, []);

  const handleNewRevision = useCallback(async (duplicate = false, fromRevision?: number) => {
    // Implementation for creating new revision
    console.log("Create new revision:", { duplicate, fromRevision });
  }, []);

  const handleDeleteRevision = useCallback(async (revision: number) => {
    // Implementation for deleting revision
    console.log("Delete revision:", revision);
  }, []);

  const handleSetClientRevision = useCallback(async (revision: BudgetHeaderType) => {
    // Implementation for setting client revision
    console.log("Set client revision:", revision);
  }, []);

  const parseFile = useCallback((data: any) => {
    // Implementation for parsing uploaded file
    console.log("Parse file:", data);
  }, []);

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
                onOpenRevisionModal={modalControls.openRevisionModal}
                onBallparkChange={handleBallparkChange}
              />
              
              <BudgetModalsContainer
                activeProject={activeProject}
                budgetHeader={budgetHeader}
                budgetItems={budgetItems}
                revisions={revisions}
                areaGroups={areaGroups}
                invoiceGroups={invoiceGroups}
                clients={clients}
                nextElementKey={nextElementKey}
                prefillItem={prefillItem}
                editItem={editItem}
                eventItem={eventItem}
                eventList={eventList}
                eventDescOptions={eventDescOptions}
                deleteTargets={deleteTargets}
                onCreateLineItem={handleCreateLineItem}
                onEditLineItem={handleEditLineItem}
                onSaveEvents={handleSaveEvents}
                onConfirmDelete={handleConfirmDelete}
                onSwitchRevision={handleSwitchRevision}
                onNewRevision={handleNewRevision}
                onDeleteRevision={handleDeleteRevision}
                onSetClientRevision={handleSetClientRevision}
                onParseFile={parseFile}
                onBallparkChange={handleBallparkChange}
                canEdit={canEdit}
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
                      handleDuplicateSelected={handleDuplicateSelectedRows}
                      openDeleteModal={() => openDeleteModal(selectedRowKeys)}
                      undoStackLength={undoStackLength}
                      redoStackLength={redoStackLength}
                      handleUndo={handleUndo}
                      handleRedo={handleRedo}
                      openCreateModal={openCreateModal}
                    />
                    <BudgetTableContainer
                      budgetItems={budgetItems}
                      groupBy={groupBy}
                      selectedRowKeys={selectedRowKeys}
                      setSelectedRowKeys={setSelectedRowKeys}
                      lockedLines={lockedLines}
                      expandedRowKeys={expandedRowKeys}
                      setExpandedRowKeys={setExpandedRowKeys}
                      tableRef={tableRef}
                      tableHeight={tableHeight}
                      pageSize={pageSize}
                      currentPage={currentPage}
                      setCurrentPage={setCurrentPage}
                      setPageSize={setPageSize}
                      eventsByLineItem={eventsByLineItem}
                      mainColumnsOrder={mainColumnsOrder}
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onEditItem={openEditModal}
                      onDeleteItems={openDeleteModal}
                      onDuplicateItem={openDuplicateModal}
                      onEventModal={openEventModal}
                      onTableSort={handleTableSort}
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

const BudgetPageContainer: React.FC = () => {
  const { projectSlug } = useParams();
  const { activeProject, updateTimelineEvents } = useData();
  
  const project = activeProject || { projectId: undefined };
  
  return (
    <BudgetProvider projectId={project.projectId}>
      <BudgetPageContentWrapper />
    </BudgetProvider>
  );
};

const BudgetPageContentWrapper: React.FC = () => {
  const { budgetHeader, budgetItems, setBudgetItems, setBudgetHeader } = useBudget();
  const { activeProject, updateTimelineEvents } = useData();
  
  // Local state for the operations provider
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [lockedLines, setLockedLines] = useState<string[]>([]);
  const [areaGroups, setAreaGroups] = useState<string[]>([]);
  const [invoiceGroups, setInvoiceGroups] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  
  return (
    <BudgetOperationsProvider
      activeProject={activeProject}
      budgetHeader={budgetHeader}
      budgetItems={budgetItems}
      setBudgetItems={setBudgetItems}
      setBudgetHeader={setBudgetHeader}
      setSelectedRowKeys={setSelectedRowKeys}
      setLockedLines={setLockedLines}
      setAreaGroups={setAreaGroups}
      setInvoiceGroups={setInvoiceGroups}
      setClients={setClients}
      clients={clients}
      areaGroups={areaGroups}
      invoiceGroups={invoiceGroups}
      updateTimelineEvents={updateTimelineEvents}
    >
      <BudgetPageContent />
    </BudgetOperationsProvider>
  );
};

export default BudgetPageContainer;