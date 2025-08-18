import React, { createContext, useContext, useEffect, useState } from "react";

const ImageLockContext = createContext({ locks: {}, provider: null });

export const useImageLocks = () => useContext(ImageLockContext);

export default function ImageLockPlugin({ provider, children }) {
  const [locks, setLocks] = useState({});

  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;
    const updateLocks = () => {
      const states = Array.from(awareness.getStates().values());
      const newLocks = {};
      states.forEach((state) => {
        if (state && state.imageLock) {
          newLocks[state.imageLock.nodeId] = state.imageLock.userName;
        }
      });
      setLocks(newLocks);
    };
    awareness.on("change", updateLocks);
    updateLocks();
    return () => {
      awareness.off("change", updateLocks);
    };
  }, [provider]);

  return (
    <ImageLockContext.Provider value={{ locks, provider }}>
      {children}
    </ImageLockContext.Provider>
  );
}