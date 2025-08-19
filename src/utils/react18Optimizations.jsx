// React 18 Performance Optimizations for MYLG App
// This file demonstrates proper usage of React 18 features for better performance

import { useTransition, useDeferredValue, startTransition, Suspense } from 'react';
import { useMemo, useCallback, useState } from 'react';

// Example 1: useTransition for expensive search operations
export const useOptimizedSearch = (items, searchTerm) => {
  const [isPending, startTransition] = useTransition();
  const [filteredItems, setFilteredItems] = useState(items);
  
  const handleSearch = useCallback((term) => {
    startTransition(() => {
      // Mark this as a non-urgent update
      const filtered = items.filter(item => 
        item.title?.toLowerCase().includes(term.toLowerCase()) ||
        item.description?.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredItems(filtered);
    });
  }, [items]);
  
  return { filteredItems, handleSearch, isPending };
};

// Example 2: useDeferredValue for input debouncing
export const DeferredSearchInput = ({ onSearch, placeholder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  // This will trigger less frequently than the input changes
  React.useEffect(() => {
    onSearch(deferredSearchTerm);
  }, [deferredSearchTerm, onSearch]);
  
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="search-input"
    />
  );
};

// Example 3: Proper Suspense boundaries for better loading states
export const ProjectListWithSuspense = () => {
  return (
    <Suspense fallback={<ProjectListSkeleton />}>
      <ProjectList />
    </Suspense>
  );
};

const ProjectListSkeleton = () => (
  <div className="project-list-skeleton">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="project-card-skeleton">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text short"></div>
      </div>
    ))}
  </div>
);

// Example 4: useId for accessibility improvements
export const AccessibleFormField = ({ label, type = 'text', ...props }) => {
  const id = React.useId();
  const descId = `${id}-desc`;
  
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} aria-describedby={descId} {...props} />
      {props.description && (
        <div id={descId} className="field-description">
          {props.description}
        </div>
      )}
    </div>
  );
};

// Example 5: Optimized message list with React.memo and proper deps
export const MessageItem = React.memo(({ message, onReact, onEdit }) => {
  const handleReaction = useCallback((emoji) => {
    onReact(message.id, emoji);
  }, [message.id, onReact]);
  
  const handleEdit = useCallback(() => {
    onEdit(message.id);
  }, [message.id, onEdit]);
  
  return (
    <div className="message-item">
      <div className="message-content">{message.content}</div>
      <div className="message-actions">
        <button onClick={() => handleReaction('👍')}>👍</button>
        <button onClick={() => handleReaction('❤️')}>❤️</button>
        <button onClick={handleEdit}>Edit</button>
      </div>
    </div>
  );
});

// Example 6: Batch state updates with startTransition
export const useBatchedUpdates = () => {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  
  const performBatchedUpdate = useCallback(() => {
    startTransition(() => {
      // These updates will be batched together
      setCount(prev => prev + 1);
      setItems(prev => [...prev, { id: Date.now(), value: Math.random() }]);
    });
  }, []);
  
  return { count, items, performBatchedUpdate };
};

// Example 7: Concurrent rendering friendly component
export const ConcurrentFriendlyList = ({ items, renderItem }) => {
  const deferredItems = useDeferredValue(items);
  const [isPending, startTransition] = useTransition();
  
  const memoizedItems = useMemo(() => 
    deferredItems.map(renderItem), 
    [deferredItems, renderItem]
  );
  
  return (
    <div className={`list-container ${isPending ? 'pending' : ''}`}>
      {memoizedItems}
    </div>
  );
};