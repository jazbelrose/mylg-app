import React from "react";
import ProjectMessagesThread from "./ProjectMessagesThread";
import ChatPanel from "./ChatPanel";

type ProjectPageLayoutProps = {
  projectId: string;
  header: React.ReactNode;
  children: React.ReactNode;
};

// Minimal prop typings for local components (adjust if your real components differ)
type ProjectMessagesThreadProps = {
  projectId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  floating: boolean;
  setFloating: (floating: boolean) => void;
  startDrag: () => void;
  headerOffset: number;
};

type ChatPanelProps = {
  projectId: string;
  initialFloating?: boolean;
  onFloatingChange?: (floating: boolean) => void;
};

// (If your imported components already export types, remove these lines)
const _ProjectMessagesThread = ProjectMessagesThread as unknown as React.FC<ProjectMessagesThreadProps>;
const _ChatPanel = ChatPanel as unknown as React.FC<ChatPanelProps>;

const MOBILE_BREAKPOINT = 768;
const MIN_THREAD_WIDTH = 350;
const MAX_THREAD_WIDTH = 800;

const ProjectPageLayout: React.FC<ProjectPageLayoutProps> = ({ projectId, header, children }) => {
  const projectHeaderRef = React.useRef<HTMLDivElement | null>(null);
  const layoutRef = React.useRef<HTMLDivElement | null>(null);
  const resizingRef = React.useRef<boolean>(false);

  const [threadWidth, setThreadWidth] = React.useState<number>(MIN_THREAD_WIDTH);
  const [headerHeights, setHeaderHeights] = React.useState<{ global: number; project: number }>({
    global: 0,
    project: 0,
  });

  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  const [floatingThread, setFloatingThread] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("chatPanelFloating");
      return stored ? stored === "true" : false;
    } catch {
      return false;
    }
  });

  // Measure global + project header heights
  React.useLayoutEffect(() => {
    const updateHeights = () => {
      const navBar = document.querySelector<HTMLElement>("header.header .nav-bar");
      const globalHeight = navBar ? navBar.getBoundingClientRect().height : 0;
      const projectHeight = projectHeaderRef.current
        ? projectHeaderRef.current.getBoundingClientRect().height
        : 0;
      setHeaderHeights({ global: globalHeight, project: projectHeight });
    };

    updateHeights();
    window.addEventListener("resize", updateHeights);
    return () => window.removeEventListener("resize", updateHeights);
  }, []);

  // Track mobile state
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle drag-resize for the thread pane
  React.useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!resizingRef.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      let newWidth = rect.right - e.clientX;
      newWidth = Math.min(MAX_THREAD_WIDTH, Math.max(MIN_THREAD_WIDTH, newWidth));
      setThreadWidth(newWidth);
    };

    const stopResize = () => {
      resizingRef.current = false;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, []);

  // Persist floatingThread state
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("chatPanelFloating", floatingThread ? "true" : "false");
    } catch {
      /* ignore write errors */
    }
  }, [floatingThread]);

  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    resizingRef.current = true;
  };

  const contentHeight = `calc(100vh - ${headerHeights.global + headerHeights.project}px)`;

  return (
    <div className="dashboard-wrapper active-project-details">
      <div
        ref={projectHeaderRef}
        style={{ position: "sticky", top: 0, zIndex: 5, backgroundColor: "#0c0c0c" }}
      >
        {header}
      </div>

      <div
        className="dashboard-layout"
        ref={layoutRef}
        style={{
          height: contentHeight,
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          {children}
        </div>

        {!floatingThread && (
          <>
            {!isMobile && (
              <div
                className="thread-resizer"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize chat panel"
                onMouseDown={startResize}
                // Make it keyboard focusable if you later add keyboard resizing
                tabIndex={0}
              />
            )}

            <div
              style={{
                flex: isMobile ? 1 : `0 0 ${threadWidth}px`,
                width: isMobile ? "100%" : threadWidth,
                minWidth: isMobile ? "auto" : MIN_THREAD_WIDTH,
                maxWidth: isMobile ? "none" : MAX_THREAD_WIDTH,
                height: "100%",
                minHeight: 0,
              }}
            >
              <_ProjectMessagesThread
                projectId={projectId}
                open
                setOpen={() => {}}
                floating={false}
                setFloating={setFloatingThread}
                startDrag={() => {}}
                headerOffset={headerHeights.global + headerHeights.project}
              />
            </div>
          </>
        )}
      </div>

      {floatingThread && (
        <_ChatPanel
          projectId={projectId}
          initialFloating
          onFloatingChange={setFloatingThread}
        />
      )}
    </div>
  );
};

export default ProjectPageLayout;
