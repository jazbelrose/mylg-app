import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const DropdownContext = createContext();

export const DropdownProvider = ({ children }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null); // This ref will point to the active dropdown's DOM element

  const openDropdown = (dropdownId, ref) => {
    setActiveDropdown(dropdownId);
    dropdownRef.current = ref; // Update the ref to point to the active dropdown's DOM element
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
    dropdownRef.current = null; // Reset the ref when the dropdown is closed
  };

  // Global click-outside logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ activeDropdown, openDropdown, closeDropdown, dropdownRef }}>
      {children}
    </DropdownContext.Provider>
  );
};

export const useDropdown = () => useContext(DropdownContext);