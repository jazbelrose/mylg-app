import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ImageLockContextValue {
    locks: Record<string, string>;
    provider: unknown;
}

const ImageLockContext = createContext<ImageLockContextValue>({ locks: {}, provider: null });

export const useImageLocks = () => useContext(ImageLockContext);

interface ImageLockPluginProps {
    provider?: { awareness: any } | null;
    children: ReactNode;
}

export default function ImageLockPlugin({ provider, children }: ImageLockPluginProps) {
    const [locks, setLocks] = useState<Record<string, string>>({});
    useEffect(() => {
        if (!provider)
            return;
        const awareness = provider.awareness;
        const updateLocks = () => {
            const states = Array.from(awareness.getStates().values());
            const newLocks: Record<string, string> = {};
            states.forEach((state) => {
                if (state && state.imageLock) {
                    newLocks[state.imageLock.nodeId] = state.imageLock.userName as string;
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
