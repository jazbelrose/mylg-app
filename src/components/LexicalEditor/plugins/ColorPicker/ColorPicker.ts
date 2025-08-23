// @ts-nocheck
import React, { useState, useEffect, ChangeEvent } from "react";
import "./styles.css";

const basicColors: readonly string[] = ["#FF5733", "#33FF57", "#3357FF", "#FFFF33", "#FF33FF"] as const;

// Validate or transform the user's input
function transformColor(hex: string): string {
    return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#000000";
}

interface ColorPickerProps {
    color?: string; // Default color if not provided
    defaultColor?: string; // Default color if not provided
    onChange?: (color: string | null) => void; // Optional callback for color changes
}

export default function ColorPicker({ 
    color = "#000000", 
    defaultColor = "#000000", 
    onChange 
}: ColorPickerProps) {
    const [temporaryColor, setTemporaryColor] = useState<string | null>(transformColor(color));
    const [hexInput, setHexInput] = useState<string>(transformColor(color));
    const [isHexValid, setIsHexValid] = useState<boolean>(true);
    useEffect(() => {
        // If the "color" prop changes from outside, sync local state
        setTemporaryColor(transformColor(color));
        setHexInput(transformColor(color));
    }, [color]);
    // Update local state as user types in the text box
    const handleHexInputChange = (newHex: string) => {
        // Auto-format: Add '#' if missing
        if (!newHex.startsWith("#")) {
            newHex = `#${newHex}`;
        }
        setHexInput(newHex);
        // Validate hex input
        const isValid = /^#[0-9A-Fa-f]{6}$/.test(newHex);
        setIsHexValid(isValid);
        // Update temporary color if valid
        if (isValid) {
            setTemporaryColor(newHex);
            onChange?.(newHex); // Notify parent of the change
        }
    };
    
    // Handle "Clear" action
    const handleClearColor = () => {
        setTemporaryColor(null); // Reset to null (no color)
        setHexInput("");
        setIsHexValid(true);
        onChange?.(null); // Notify parent that the color should be cleared
    };
    return (
        <div className="color-picker-wrapper">
            <div className="text-input">
                <label>
                    Hex:
                    <input
                        type="text"
                        value={hexInput}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleHexInputChange(e.target.value)}
                        className={`text-input-field ${!isHexValid ? "invalid" : ""}`}
                        aria-invalid={!isHexValid}
                        maxLength={7}
                    />
                </label>
                {!isHexValid && (
                    <span className="error-message">Invalid hex color</span>
                )}
            </div>
            
            <div className="color-picker-container">
                <label className="color-picker-label">
                    <input
                        type="color"
                        value={temporaryColor || "#000000"}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const newColor = e.target.value;
                            setTemporaryColor(newColor);
                            setHexInput(newColor);
                            setIsHexValid(true);
                            onChange?.(newColor); // Notify parent of the change
                        }}
                        className="native-color-picker"
                        aria-label="Choose color"
                    />
                </label>
            </div>
            
            <button
                onClick={handleClearColor}
                type="button"
                className="clear-color-btn"
                aria-label="Clear color selection"
            >
                Clear
            </button>
            
            <div className="color-picker-basic-color">
                {basicColors.map((c) => (
                    <button
                        key={c}
                        style={{ backgroundColor: c }}
                        onClick={() => {
                            setTemporaryColor(c);
                            setHexInput(c);
                            setIsHexValid(true);
                            onChange?.(c); // Notify parent of the change
                        }}
                        className={c === temporaryColor ? "active" : ""}
                        aria-label={`Select color ${c}`}
                    />
                ))}
            </div>
            
            <div
                className="color-picker-color"
                style={{
                    backgroundColor: temporaryColor || "#000000", // Fallback to black if null
                    width: "100px",
                    height: "100px",
                    marginTop: "20px",
                }}
                aria-label="Selected color preview"
            />
        </div>
    );
}
