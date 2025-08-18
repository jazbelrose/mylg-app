import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import ProjectMessagesThread from './ProjectMessagesThread';

const ChatPanel = ({ projectId, initialFloating = false, onFloatingChange, initialOpen = true }) => {
  const isNarrowScreen =
    typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isMobile, setIsMobile] = useState(isNarrowScreen);
  const [open, setOpen] = useState(isNarrowScreen ? false : initialOpen);
  const prevHeightRef = useRef(400);
  const [floating, setFloating] = useState(isNarrowScreen ? true : initialFloating);
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return { width: 360, height: 400 };
    try {
      const stored = localStorage.getItem('chatPanelSize');
      if (stored) return JSON.parse(stored);
    } catch {
      /* ignore parse errors */
    }
    return { width: 360, height: 400 };
  });
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const stored = localStorage.getItem('chatPanelPosition');
      if (stored) return JSON.parse(stored);
    } catch {
      /* ignore parse errors */
    }
    const panelWidth = 360; // match .chat-panel width
    const panelHeight = 400; // match your initial height
    return {
      x: window.innerWidth - panelWidth - 32,
      y: window.innerHeight - panelHeight - 32,
    };
  });
  const [headerOffset, setHeaderOffset] = useState(50);
  const [dockedHeight, setDockedHeight] = useState(null);

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const resizingRef = useRef(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('chatPanelPosition', JSON.stringify(position));
    } catch {
      /* ignore write errors */
    }
  }, [position]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('chatPanelSize', JSON.stringify(size));
    } catch {
      /* ignore write errors */
    }
  }, [size]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (panelRef.current) {
        const { offsetWidth, offsetHeight } = panelRef.current;
        setPosition(pos => ({
          x: Math.max(0, Math.min(pos.x, window.innerWidth - offsetWidth)),
          y: Math.max(0, Math.min(pos.y, window.innerHeight - offsetHeight)),
        }));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useLayoutEffect(() => {
    const updateOffset = () => {
      const navBar = document.querySelector('header.header .nav-bar');
      const projectHeader = document.querySelector('.project-header');
      const globalHeight = navBar ? navBar.getBoundingClientRect().height : 0;
      const projectHeight = projectHeader ? projectHeader.getBoundingClientRect().height : 0;
      setHeaderOffset(globalHeight + projectHeight);
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, []);

  useEffect(() => {
    if (floating) return;
    const updateHeight = () => {
      const column = document.querySelector('.column-2');
      const columnHeight = column ? column.getBoundingClientRect().height : 0;
      const available = window.innerHeight - headerOffset;
      setDockedHeight(Math.min(available, columnHeight || available));
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [floating, headerOffset, open]);

    useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (open && !floating) {
      const width = panelRef.current?.offsetWidth || 350;
      body.classList.add('chat-panel-docked');
      body.style.setProperty('--chat-panel-width', `${width}px`);
    } else {
      body.classList.remove('chat-panel-docked');
      body.style.removeProperty('--chat-panel-width');
    }
  }, [open, floating]);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('chat-panel-docked');
        document.body.style.removeProperty('--chat-panel-width');
      }
    };
  }, []);

  const handleSetFloating = (valueOrUpdater) => {
    setFloating(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      if (onFloatingChange) onFloatingChange(next);
      return next;
    });
  };

  const headerHeight = 90;

  const handleSetOpen = (valueOrUpdater) => {
    setOpen(prev => {
      const next =
        typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      if (next === prev) return prev;
      if (!next) {
        prevHeightRef.current = size.height;
        setSize(s => ({ ...s, height: headerHeight }));
      } else {
        setSize(s => ({ ...s, height: prevHeightRef.current || s.height }));
      }
      return next;
    });
  };

  const startDrag = (e) => {
    if (!floating || isMobile) return;
    draggingRef.current = true;
    hasDraggedRef.current = false;
    dragOffsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
  };

  const startResize = (e) => {
    if (!floating || isMobile || !open) return;
    e.preventDefault();
    resizingRef.current = true;
    if (panelRef.current) {
      panelRef.current.style.transition = 'none';
    }
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
  };

  const onDrag = (e) => {
    if (!draggingRef.current || !panelRef.current) return;
    hasDraggedRef.current = true;
    const panel = panelRef.current;
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    const clampedX = Math.min(
      Math.max(0, newX),
      window.innerWidth - panel.offsetWidth
    );
    const clampedY = Math.min(
      Math.max(0, newY),
      window.innerHeight - panel.offsetHeight
    );
    setPosition({ x: clampedX, y: clampedY });
  };

  const onResize = (e) => {
    if (!resizingRef.current || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    let newWidth = e.clientX - rect.left;
    let newHeight = e.clientY - rect.top;
    const MIN_W = 360;
    const MIN_H = 280;
    const maxWidth = window.innerWidth - rect.left;
    const maxHeight = window.innerHeight - rect.top;
    newWidth = Math.min(maxWidth, Math.max(MIN_W, newWidth));
    newHeight = Math.min(maxHeight, Math.max(MIN_H, newHeight));
    setSize({ width: newWidth, height: newHeight });
    setPosition(pos => ({
      x: Math.max(0, Math.min(pos.x, window.innerWidth - newWidth)),
      y: Math.max(0, Math.min(pos.y, window.innerHeight - newHeight))
    }));
  };

  const endDrag = () => {
    draggingRef.current = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
  };

  const stopResize = () => {
    resizingRef.current = false;
    if (panelRef.current) {
      panelRef.current.style.transition = '';
    }
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
  };

  const panelStyle = isMobile
    ? { left: 0, right: 0, bottom: 0 }
    : floating
    ? {
        top: position.y,
        left: position.x,
        right: 'auto',
        width: size.width,
        height: size.height,
        minWidth: 300,
        minHeight: open ? 280 : headerHeight,
      }
    : { '--chat-panel-top': `${headerOffset}px`, height: dockedHeight ? `${dockedHeight}px` : undefined };

  return (
    <div
      ref={panelRef}
      className={`chat-panel ${open ? 'open' : 'closed'} ${floating ? 'floating' : 'docked'} ${isMobile ? 'bottom' : ''}`}
      style={panelStyle}
      onClick={() => {
        if (hasDraggedRef.current) {
          hasDraggedRef.current = false;
          return;
        }
        if (!open) handleSetOpen(true);
      }}
    >
      <ProjectMessagesThread
        projectId={projectId}
        open={open}
        setOpen={handleSetOpen}
        floating={floating}
        setFloating={handleSetFloating}
        startDrag={startDrag}
      />
      {floating && !isMobile && (
        <div className="chat-panel-resizer" onMouseDown={startResize} />
      )}
    </div>
  );
};

export default ChatPanel;