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
import ConfirmModal from "../../../components/ConfirmModal";
import * as ExcelJS from "exceljs";
import styles from "./BudgetPage.module.css";

import ProjectPageLayout from "../components/SingleProject/ProjectPageLayout";
import ProjectHeader from "../components/SingleProject/ProjectHeader";
import QuickLinksComponent from "../components/SingleProject/QuickLinksComponent";
import FileManagerComponent from "../components/SingleProject/FileManager";
import BudgetHeader from "./components/BudgetHeader";
import BudgetFileModal from "./components/BudgetFileModal";
import CreateLineItemModal from "../components/SingleProject/CreateLineItemModal";
import EventEditModal from "../components/SingleProject/EventEditModal";
import RevisionModal from "../components/SingleProject/RevisionModal";
import BudgetChart from "./components/BudgetChart";
import BudgetToolbar from "./components/BudgetToolbar";
import BudgetItemsTable from "./components/BudgetItemsTable";
import BudgetStateManager from "./components/BudgetStateManager";
import BudgetEventManager from "./components/BudgetEventManager";
import BudgetTableLogic from "./components/BudgetTableLogic";
import { BudgetProvider, useBudget } from "./components/BudgetDataProvider";
import { useData } from "../../../app/contexts/DataProvider";
import { findProjectBySlug, slugify } from "../../../utils/slug";
import {
  fetchBudgetHeaders,
  updateBudgetItem,
  fetchBudgetItems,
} from "../../../utils/api";

const TABLE_HEADER_FOOTER = 110;
const TABLE_BOTTOM_MARGIN = 20;

// Inner component that uses the budget context
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
  const quickLinksRef = useRef(null);
  const tableRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Budget data from context
  const { budgetHeader, budgetItems } = useBudget();

  // Simplified state for remaining functionality
  const [budgetData, setBudgetData] = useState([]);
  const [error, setError] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [areaGroups, setAreaGroups] = useState([]);
  const [invoiceGroups, setInvoiceGroups] = useState([]);
  const [clients, setClients] = useState([]);

  useLayoutEffect(() => {
    const updateTableHeight = () => {
      if (tableRef.current) {
        const top = tableRef.current.getBoundingClientRect().top;
        setTableHeight(window.innerHeight - top - TABLE_BOTTOM_MARGIN);
      }
    };

    updateTableHeight();
    window.addEventListener("resize", updateTableHeight);

    let resizeObserver;
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

  const handleBack = () => {
    navigate(`/dashboard/projects/${projectSlug}`);
  };

  const parseStatusToNumber = (statusString) => {
    if (statusString === undefined || statusString === null) {
      return 0;
    }
    const str =
      typeof statusString === "string" ? statusString : String(statusString);
    const num = parseFloat(str.replace("%", ""));
    return Number.isNaN(num) ? 0 : num;
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

  const handleBallparkChange = async (val) => {
    if (!activeProject?.projectId || !budgetHeader) return;
    try {
      await updateBudgetItem(activeProject.projectId, budgetHeader.budgetItemId, {
        headerBallPark: val,
        revision: budgetHeader.revision,
      });
      // Note: setBudgetHeader will be handled by the BudgetDataProvider
    } catch (err) {
      console.error('Error updating ballpark', err);
    }
  };

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

  const computeGroupsAndClients = useCallback(
    (items, header) => {
      const aSet = new Set();
      const iSet = new Set();
      const cSet = new Set(Array.isArray(header?.clients) ? header.clients : []);
      items.forEach((it) => {
        if (it.areaGroup) aSet.add(String(it.areaGroup).trim().toUpperCase());
        if (it.invoiceGroup)
          iSet.add(String(it.invoiceGroup).trim().toUpperCase());
        if (it.client) cSet.add(it.client);
      });
      setAreaGroups(Array.from(aSet));
      setInvoiceGroups(Array.from(iSet));
      setClients(Array.from(cSet));
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!activeProject?.projectId) return;
    try {
      const revs = await fetchBudgetHeaders(activeProject.projectId);
      setRevisions(revs);
      const header =
        revs.find((h) => h.revision === h.clientRevisionId) || revs[0] || null;
      if (header) {
        if (header.budgetId) {
          const items = await fetchBudgetItems(header.budgetId, header.revision);
          computeGroupsAndClients(items, header);
        }
      } else {
        setClients([]);
      }
    } catch (err) {
      console.error("Error fetching budget header", err);
    }
  }, [activeProject?.projectId, computeGroupsAndClients]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleNewRevision = async (duplicate = false, fromRevision = null) => {
    if (!activeProject?.projectId || !budgetHeader) return;
    // Revision logic here - simplified for now
    console.log('New revision requested:', duplicate, fromRevision);
  };

  const handleSwitchRevision = async (rev) => {
    if (!activeProject?.projectId) return;
    const header = revisions.find((h) => h.revision === rev);
    if (!header) return;
    try {
      const items = await fetchBudgetItems(header.budgetId, rev);
      computeGroupsAndClients(items, header);
    } catch (err) {
      console.error('Error switching revision', err);
    }
  };

  const handleDeleteRevision = async (rev) => {
    console.log('Delete revision requested:', rev);
    // Deletion logic would go here
  };

  const handleSetClientRevision = async (rev) => {
    console.log('Set client revision requested:', rev);
    // Client revision logic would go here
  };

  const parseFile = async (file) => {
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      
      const worksheet = workbook.worksheets[0];
      const json = [];
      
      // Convert worksheet to JSON starting from row 12 (index 11)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 12) { // Skip first 11 rows
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
          'Could not find "Element Description" (or "Category") and "Final Total" (or "Amount") columns.'
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

  const handleTableChange = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    // Table change logic handled by table components
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

              {/* Use the new component structure */}
              <BudgetStateManager activeProject={activeProject}>
                {(stateManager) => (
                  <BudgetEventManager
                    activeProject={activeProject}
                    eventsByLineItem={eventsByLineItem}
                    updateTimelineEvents={updateTimelineEvents}
                    userId={userId}
                    user={user}
                    stateManager={stateManager}
                  >
                    {(eventHandlers) => (
                      <BudgetTableLogic
                        groupBy={stateManager.groupBy}
                        sortField={stateManager.sortField}
                        sortOrder={stateManager.sortOrder}
                        selectedRowKeys={stateManager.selectedRowKeys}
                        expandedRowKeys={stateManager.expandedRowKeys}
                        eventsByLineItem={eventsByLineItem}
                        setSelectedRowKeys={stateManager.setSelectedRowKeys}
                        openEditModal={eventHandlers.openEditModal}
                        openDeleteModal={eventHandlers.openDeleteModal}
                        openDuplicateModal={eventHandlers.openDuplicateModal}
                        openEventModal={eventHandlers.openEventModal}
                      >
                        {(tableConfig) => (
                          <>
                            <BudgetHeader
                              activeProject={activeProject}
                              budgetHeader={budgetHeader}
                              budgetItems={budgetItems}
                              groupBy={stateManager.groupBy}
                              setGroupBy={stateManager.setGroupBy}
                              onOpenRevisionModal={() => stateManager.setRevisionModalOpen(true)}
                              onBallparkChange={handleBallparkChange}
                            />
                            <BudgetFileModal
                              isOpen={stateManager.isBudgetModalOpen}
                              onRequestClose={() => stateManager.setBudgetModalOpen(false)}
                              onFileSelected={parseFile}
                            />
                            <RevisionModal
                              isOpen={stateManager.isRevisionModalOpen}
                              onRequestClose={() => stateManager.setRevisionModalOpen(false)}
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
                              isOpen={stateManager.isCreateModalOpen}
                              onRequestClose={eventHandlers.closeCreateModal}
                              onSubmit={(d, isAutoSave) =>
                                stateManager.editItem
                                  ? eventHandlers.handleEditLineItem(d, isAutoSave)
                                  : eventHandlers.handleCreateLineItem(d, isAutoSave)
                              }
                              defaultElementKey={stateManager.nextElementKey}
                              budgetItems={budgetItems}
                              areaGroupOptions={areaGroups}
                              invoiceGroupOptions={invoiceGroups}
                              clientOptions={clients}
                              defaultStartDate={budgetHeader?.startDate || ''}
                              defaultEndDate={budgetHeader?.endDate || ''}
                              initialData={stateManager.prefillItem || stateManager.editItem}
                              title={stateManager.editItem ? 'Edit Item' : 'Create Line Item'}
                              revision={budgetHeader?.revision || 1}
                            />
                            <EventEditModal
                              isOpen={stateManager.isEventModalOpen}
                              onRequestClose={eventHandlers.closeEventModal}
                              events={stateManager.eventList}
                              defaultDate={budgetHeader?.startDate || ''}
                              defaultDescription={stateManager.eventItem?.description || ''}
                              descOptions={eventDescOptions}
                              onSubmit={eventHandlers.handleSaveEvents}
                            />
                            <ConfirmModal
                              isOpen={stateManager.isConfirmingDelete}
                              onRequestClose={() => stateManager.setIsConfirmingDelete(false)}
                              onConfirm={eventHandlers.confirmDelete}
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
                                    groupBy={stateManager.groupBy}
                                    onGroupChange={(val) => stateManager.setGroupBy(val as string)}
                                    selectedRowKeys={stateManager.selectedRowKeys}
                                    handleDuplicateSelected={eventHandlers.handleDuplicateSelected}
                                    openDeleteModal={eventHandlers.openDeleteModal}
                                    undoStackLength={stateManager.undoStack.length}
                                    redoStackLength={stateManager.redoStack.length}
                                    handleUndo={stateManager.handleUndo}
                                    handleRedo={stateManager.handleRedo}
                                    openCreateModal={eventHandlers.openCreateModal}
                                  />
                                  <BudgetItemsTable
                                    dataSource={budgetItems.length > 0 ? tableConfig.groupedTableData : []}
                                    columns={tableConfig.tableColumns}
                                    groupBy={stateManager.groupBy}
                                    selectedRowKeys={stateManager.selectedRowKeys}
                                    lockedLines={stateManager.lockedLines}
                                    handleTableChange={handleTableChange}
                                    openEditModal={eventHandlers.openEditModal}
                                    openDeleteModal={eventHandlers.openDeleteModal}
                                    expandedRowRender={tableConfig.expandedRowRender}
                                    expandedRowKeys={stateManager.expandedRowKeys}
                                    setExpandedRowKeys={stateManager.setExpandedRowKeys}
                                    tableRef={tableRef}
                                    tableHeight={tableHeight}
                                    pageSize={stateManager.pageSize}
                                    currentPage={stateManager.currentPage}
                                    setCurrentPage={stateManager.setCurrentPage}
                                    setPageSize={stateManager.setPageSize}
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </BudgetTableLogic>
                    )}
                  </BudgetEventManager>
                )}
              </BudgetStateManager>
            </div>
          </motion.div>
        </AnimatePresence>
      </ProjectPageLayout>
    </>
  );
};

// Main component that provides the budget context
const BudgetPage = () => {
  const { activeProject } = useData();
  
  return (
    <BudgetProvider projectId={activeProject?.projectId}>
      <BudgetPageContent />
    </BudgetProvider>
  );
};

export default BudgetPage;