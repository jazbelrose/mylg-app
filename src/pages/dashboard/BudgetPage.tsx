import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, ChangeEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { Table, Segmented, Tooltip as AntTooltip } from "antd";
import { CHART_COLORS } from "../../utils/colorUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faClone, faClock, faUndo, faRedo, faPlus } from "@fortawesome/free-solid-svg-icons";
import ConfirmModal from "../../components/ConfirmModal";
import * as ExcelJS from "exceljs";
import { v4 as uuid } from "uuid";
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
import useBudgetData from "./components/SingleProject/useBudgetData";
import { useData } from "../../app/contexts/DataProvider";
import { useAuth } from "../../app/contexts/AuthContext";
import { useSocket } from "../../app/contexts/SocketContext";
import { normalizeMessage } from "../../utils/websocketUtils";
import { findProjectBySlug, slugify } from "../../utils/slug";
import { formatUSD } from "../../utils/budgetUtils";
import { fetchBudgetHeaders, createBudgetItem, updateBudgetItem, fetchBudgetItems, deleteBudgetItem } from "../../utils/api";
import { enqueueProjectUpdate } from "../../utils/requestQueue";

// Components
import BudgetChart from "./components/BudgetPage/BudgetChart";
import BudgetTable from "./components/BudgetPage/BudgetTable";
import BudgetActions from "./components/BudgetPage/BudgetActions";

const TABLE_HEADER_FOOTER = 110;
const TABLE_BOTTOM_MARGIN = 20;

// Types
interface BudgetData {
  category: string;
  amount: number;
}

interface Project {
  projectId: string;
  title: string;
  slug?: string;
  timelineEvents?: any[];
  [key: string]: any;
}

interface BudgetHeader {
  budgetItemId: string;
  revision: number;
  headerBallPark: number;
  [key: string]: any;
}

interface BudgetItem {
  budgetItemId: string;
  [key: string]: any;
}

// Simple throttle utility (leading + trailing)
function throttle<T extends (...args: any[]) => any>(fn: T, wait = 600): T {
  let last = 0;
  let t: NodeJS.Timeout;
  let lastArgs: Parameters<T>;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;
    
    const run = () => {
      last = Date.now();
      fn(...lastArgs);
    };
    
    if (now - last >= wait) {
      run();
    } else {
      clearTimeout(t);
      t = setTimeout(run, wait - (now - last));
    }
  }) as T;
}

const BudgetPage: React.FC = () => {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    activeProject: initialActiveProject,
    projects,
    fetchProjectDetails,
    setProjects,
    setSelectedProjects,
    updateTimelineEvents,
  } = useData();
  
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const userId = user?.userId;
  const isAdmin = role === "admin";
  const isBuilder = role === "builder";
  const isDesigner = role === "designer";
  const canEdit = isAdmin || isBuilder || isDesigner;
  
  const { ws } = useSocket();
  
  // State
  const [activeProject, setActiveProject] = useState<Project | null>(initialActiveProject);
  const [filesOpen, setFilesOpen] = useState(false);
  const quickLinksRef = useRef<any>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState(0);
  const [saving, setSaving] = useState(false);

  // Budget data hook
  const { budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, refresh, loading } = useBudgetData(
    activeProject?.projectId || null
  );

  // Additional state from original file
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventEditModal, setShowEventEditModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBudgetFileModal, setShowBudgetFileModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [deletingItems, setDeletingItems] = useState<string[]>([]);

  useLayoutEffect(() => {
    const updateTableHeight = () => {
      if (tableRef.current) {
        const top = tableRef.current.getBoundingClientRect().top;
        setTableHeight(window.innerHeight - top - TABLE_BOTTOM_MARGIN);
      }
    };
    
    updateTableHeight();
    window.addEventListener("resize", updateTableHeight);
    
    let resizeObserver: ResizeObserver | null = null;
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

  const parseStatusToNumber = (statusString: string | number | undefined | null): number => {
    if (statusString === undefined || statusString === null) {
      return 0;
    }
    const str = typeof statusString === "string" ? statusString : String(statusString);
    const num = parseFloat(str.replace("%", ""));
    return Number.isNaN(num) ? 0 : num;
  };

  const beautifyLabel = (key: string): string => {
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

  const handleActiveProjectChange = (updatedProject: Project) => {
    setActiveProject(updatedProject);
  };

  const handleProjectDeleted = (deletedProjectId: string) => {
    setProjects((prev: Project[]) => prev.filter((p) => p.projectId !== deletedProjectId));
    setSelectedProjects((prev: Project[]) => prev.filter((p) => p.projectId !== deletedProjectId));
    navigate("/dashboard/projects");
  };

  const handleBallparkChange = async (val: number) => {
    if (!activeProject?.projectId || !budgetHeader) return;
    
    try {
      await updateBudgetItem(activeProject.projectId, budgetHeader.budgetItemId, {
        headerBallPark: val,
        revision: budgetHeader.revision,
      });
      setBudgetHeader((prev: BudgetHeader | null) => 
        prev ? { ...prev, headerBallPark: val } : prev
      );
      emitBudgetUpdate();
    } catch (err) {
      console.error('Error updating ballpark', err);
    }
  };

  const emitBudgetUpdate = () => {
    if (ws && activeProject?.projectId) {
      ws.send(JSON.stringify({
        type: 'budget_update',
        projectId: activeProject.projectId,
        timestamp: Date.now()
      }));
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

  const eventsByLineItem = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (Array.isArray(activeProject?.timelineEvents)) {
      activeProject.timelineEvents.forEach((event: any) => {
        if (event.budgetItemId) {
          if (!map[event.budgetItemId]) {
            map[event.budgetItemId] = [];
          }
          map[event.budgetItemId].push(event);
        }
      });
    }
    return map;
  }, [activeProject?.timelineEvents]);

  // Create budget data for chart
  const budgetData: BudgetData[] = useMemo(() => {
    if (!budgetItems || budgetItems.length === 0) return [];
    
    const categoryTotals: Record<string, number> = {};
    
    budgetItems.forEach((item: any) => {
      const category = item.category || 'Other';
      const amount = parseFloat(item.itemFinalCost || item.itemActualCost || item.itemBudgetedCost || 0);
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });
    
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount
    }));
  }, [budgetItems]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
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
        <div style={{ color: '#FA3356', marginBottom: '10px' }}>
          Saving...
        </div>
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
            <QuickLinksComponent
              ref={quickLinksRef}
              projectId={activeProject?.projectId}
              hideTrigger
            />
            
            <FileManagerComponent
              isOpen={filesOpen}
              onRequestClose={() => setFilesOpen(false)}
              projectId={activeProject?.projectId}
            />

            <BudgetHeader
              budget={budgetHeader}
              onBallparkChange={handleBallparkChange}
              canEdit={canEdit}
              onOpenBudgetFile={() => setShowBudgetFileModal(true)}
            />

            <BudgetActions
              selectedRowKeys={selectedRowKeys}
              canEdit={canEdit}
              onCreateLineItem={() => setShowCreateModal(true)}
              onDeleteItems={() => setShowConfirmModal(true)}
              onExportExcel={() => {/* TODO: Implement export */}}
              onRevisionModal={() => setShowRevisionModal(true)}
            />

            {error && (
              <div style={{ marginTop: "10px", color: "#ff6b6b" }}>
                Error: {error}
              </div>
            )}

            {budgetData.length > 0 && (
              <BudgetChart data={budgetData} />
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
              <div
                style={{
                  marginBottom: "10px",
                  color: "white",
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Segmented
                  size="small"
                  options={[
                    { label: "None", value: "none" },
                    { label: "Area Group", value: "areaGroup" },
                    { label: "Invoice Group", value: "invoiceGroup" },
                    { label: "Category", value: "category" },
                  ]}
                  value={groupBy}
                  onChange={(value) => setGroupBy(value as string)}
                />
              </div>

              <div ref={tableRef} style={{ width: "100%" }}>
                <BudgetTable
                  budgetItems={budgetItems}
                  eventsByLineItem={eventsByLineItem}
                  selectedRowKeys={selectedRowKeys}
                  setSelectedRowKeys={setSelectedRowKeys}
                  groupBy={groupBy}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  setCurrentPage={setCurrentPage}
                  setPageSize={setPageSize}
                  tableHeight={tableHeight}
                  canEdit={canEdit}
                  onEditEvent={setEditingEvent}
                  beautifyLabel={beautifyLabel}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <CreateLineItemModal
        isOpen={showCreateModal}
        onRequestClose={() => setShowCreateModal(false)}
        onSubmit={() => {/* TODO: Handle submit */}}
        budgetItems={budgetItems}
      />

      <EventEditModal
        isOpen={showEventEditModal}
        onRequestClose={() => setShowEventEditModal(false)}
        event={editingEvent}
        onSave={() => {/* TODO: Handle save */}}
      />

      <RevisionModal
        isOpen={showRevisionModal}
        onRequestClose={() => setShowRevisionModal(false)}
        budget={budgetHeader}
        onCreateRevision={() => {/* TODO: Handle revision */}}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
        title="Delete Items"
        message={`Are you sure you want to delete ${selectedRowKeys.length} item(s)?`}
        onConfirm={() => {/* TODO: Handle delete */}}
      />

      <BudgetFileModal
        isOpen={showBudgetFileModal}
        onRequestClose={() => setShowBudgetFileModal(false)}
        projectId={activeProject?.projectId}
      />
    </ProjectPageLayout>
  );
};

export default BudgetPage;