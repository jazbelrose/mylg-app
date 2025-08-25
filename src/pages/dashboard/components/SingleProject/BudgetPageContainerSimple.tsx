import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProjectPageLayout from "./ProjectPageLayout";
import ProjectHeader from "./ProjectHeader";
import QuickLinksComponent from "./QuickLinksComponent";
import FileManagerComponent from "./FileManager";
import BudgetHeader from "./BudgetHeader";
import BudgetChart from "./BudgetChart";
import BudgetToolbar from "./BudgetToolbar";
import BudgetItemsTable from "./BudgetItemsTable";
import { BudgetProvider, useBudget } from "./BudgetDataProvider";
import styles from "../../BudgetPage.module.css";
import { useData } from "../../../../app/contexts/DataProvider";
import { slugify } from "../../../../utils/slug";

const BudgetPageContent: React.FC = () => {
  const { projectSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeProject: initialActiveProject,
    projects,
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
  
  // Budget data from provider
  const { budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, refresh, loading } = useBudget();
  
  // Local state
  const [activeProject, setActiveProject] = useState(initialActiveProject);
  const [filesOpen, setFilesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState("invoiceGroup");

  // Refs
  const quickLinksRef = useRef(null);

  // Initialize project
  useEffect(() => {
    if (!projectSlug) return;
    
    let project = initialActiveProject;
    if (!project || slugify(project.title) !== projectSlug) {
      const foundProject = projects.find(p => slugify(p.title) === projectSlug);
      if (!foundProject) {
        navigate("/dashboard");
        return;
      }
      setActiveProject(foundProject);
    }
  }, [projectSlug, initialActiveProject, projects, navigate]);

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

  const parseStatusToNumber = useCallback((status: string) => {
    const statusMap: Record<string, number> = {
      "planning": 0,
      "in-progress": 1,
      "review": 2,
      "completed": 3,
    };
    return statusMap[status?.toLowerCase()] ?? 0;
  }, []);

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
                onOpenRevisionModal={() => {}}
                onBallparkChange={() => {}}
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
                      selectedRowKeys={[]}
                      handleDuplicateSelected={() => {}}
                      openDeleteModal={() => {}}
                      undoStackLength={0}
                      redoStackLength={0}
                      handleUndo={() => {}}
                      handleRedo={() => {}}
                      openCreateModal={() => {}}
                    />
                    <BudgetItemsTable
                      dataSource={budgetItems || []}
                      columns={[]}
                      groupBy={groupBy}
                      selectedRowKeys={[]}
                      lockedLines={[]}
                      handleTableChange={() => {}}
                      openEditModal={() => {}}
                      openDeleteModal={() => {}}
                      expandedRowRender={() => null}
                      expandedRowKeys={[]}
                      setExpandedRowKeys={() => {}}
                      tableRef={useRef()}
                      tableHeight={400}
                      pageSize={50}
                      currentPage={1}
                      setCurrentPage={() => {}}
                      setPageSize={() => {}}
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
  const { activeProject } = useData();
  
  return (
    <BudgetProvider projectId={activeProject?.projectId}>
      <BudgetPageContent />
    </BudgetProvider>
  );
};

export default BudgetPageContainer;