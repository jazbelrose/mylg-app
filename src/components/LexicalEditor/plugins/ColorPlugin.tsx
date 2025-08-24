// @ts-nocheck
import React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useState } from "react";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR, } from "lexical";
import { $patchStyleText } from "@lexical/selection";
import { SET_TEXT_COLOR_COMMAND, SET_BG_COLOR_COMMAND } from "../commands";
import ColorPicker from "./ColorPicker/ColorPicker"; // Assuming you have a ColorPicker component
import { useDropdown } from "../contexts/DropdownContext"; // Access dropdown context from LexicalEditor

interface ColorPluginProps {
    showToolbar?: boolean;
}

export default function ColorPlugin({ showToolbar = true }: ColorPluginProps) {
    // DropdownProvider is supplied by LexicalEditor
    if (!showToolbar) {
        return <ColorPluginContent showToolbar={false} />;
    }
    return <ColorPluginContent showToolbar={true} />;
}

interface ColorPluginContentProps {
    showToolbar: boolean;
}

function ColorPluginContent({ showToolbar }: ColorPluginContentProps) {
    const [editor] = useLexicalComposerContext();
    const [currentTextColor, setCurrentTextColor] = useState<string>("#000000");
    const [currentBgColor, setCurrentBgColor] = useState<string>("#FFFFFF");
    const { activeDropdown, openDropdown, closeDropdown, dropdownRef } = useDropdown();
    const textColorDropdownId = "text-color-dropdown";
    const bgColorDropdownId = "bg-color-dropdown";
    
    // Toggle the text color picker dropdown
    const toggleTextColorPicker = () => {
        if (activeDropdown === textColorDropdownId) {
            closeDropdown();
        }
        else {
            openDropdown(textColorDropdownId, dropdownRef);
        }
    };
    // Toggle the background color picker dropdown
    const toggleBgColorPicker = () => {
        if (activeDropdown === bgColorDropdownId) {
            closeDropdown();
        }
        else {
            openDropdown(bgColorDropdownId, dropdownRef);
        }
    };
    // Handle text color change
    const handleTextColorChange = (newColor: string) => {
        setCurrentTextColor(newColor);
        editor.dispatchCommand(SET_TEXT_COLOR_COMMAND, newColor);
    };
    
    // Handle background color change
    const handleBgColorChange = (newColor: string) => {
        setCurrentBgColor(newColor);
        editor.dispatchCommand(SET_BG_COLOR_COMMAND, newColor);
    };
    // Register commands for text and background color
    useEffect(() => {
        // --- Text Color Command ---
        const unregisterTextColorCommand = editor.registerCommand(SET_TEXT_COLOR_COMMAND, (payload) => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    if (payload === null) {
                        // Remove any existing text color
                        $patchStyleText(selection, { color: null });
                    }
                    else {
                        // Apply the given color
                        $patchStyleText(selection, { color: payload });
                    }
                }
            });
            return true;
        }, COMMAND_PRIORITY_EDITOR);
        // --- Background Color Command ---
        const unregisterBgColorCommand = editor.registerCommand(SET_BG_COLOR_COMMAND, (payload) => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    if (payload === null) {
                        // Remove any existing background color
                        $patchStyleText(selection, { "background-color": null });
                    }
                    else {
                        // Apply the given background color
                        $patchStyleText(selection, { "background-color": payload });
                    }
                }
            });
            return true;
        }, COMMAND_PRIORITY_EDITOR);
        // Cleanup on unmount
        return () => {
            unregisterTextColorCommand();
            unregisterBgColorCommand();
        };
    }, [editor]);
    if (!showToolbar) {
        return null;
    }
    
    return (
        <div className="toolbar">
            <button
                type="button"
                onClick={toggleTextColorPicker}
                aria-label="Set Text Color"
                className="toolbar-item"
            >
                <i className="format font-color" style={{ opacity: 1 }} />
            </button>
            {activeDropdown === textColorDropdownId && (
                <div 
                    className="color-dropdown" 
                    ref={dropdownRef}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <ColorPicker
                        color={currentTextColor || "#000000"}
                        defaultColor="#000000"
                        onChange={handleTextColorChange}
                    />
                </div>
            )}
            <button
                type="button"
                onClick={toggleBgColorPicker}
                aria-label="Set Background Color"
                className="toolbar-item"
            >
                <i className="format bg-color" style={{ opacity: 1 }} />
            </button>
            {activeDropdown === bgColorDropdownId && (
                <div 
                    className="color-dropdown" 
                    ref={dropdownRef}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <ColorPicker
                        color={currentBgColor || "#FFFFFF"}
                        defaultColor="#FFFFFF"
                        onChange={handleBgColorChange}
                    />
                </div>
            )}
        </div>
    );
}
