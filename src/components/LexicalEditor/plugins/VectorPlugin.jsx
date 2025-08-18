import React, { useState, useRef } from "react";
import ReactModal from "react-modal";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodes, $getSelection, $isRangeSelection } from "lexical";
import { $createSvgNode } from "./nodes/SvgNode";
import { BezierCurveOutlined } from '@ant-design/icons';

if (typeof document !== 'undefined') {
  ReactModal.setAppElement("#root");
}

export default function VectorPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [svgText, setSvgText] = useState("");
  const inputRef = useRef(null);

  const handleFileRead = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => setSvgText(e.target.result);
    reader.readAsText(f);
  };

  const onAddSvg = () => {
    if (!svgText.trim()) return;
    editor.update(() => {
      const node = $createSvgNode({ svg: svgText, width: 300, height: 200 });
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([node]);
      } else {
        $insertNodes([node]);
      }
    });
    setSvgText("");
    setFile(null);
    setIsOpen(false);
  };

  return (
    <div style={{ display: "inline-block" }}>
      <button
        aria-label="Add SVG"
        onClick={() => setIsOpen(true)}
        className="toolbar-item"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <BezierCurveOutlined style={{ fontSize: 18, color: '#777' }} />
      </button>
      <input
        type="file"
        accept=".svg"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setFile(f);
            handleFileRead(f);
          }
          e.target.value = null;
        }}
      />
      <ReactModal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        style={{
          overlay: {
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          },
          content: {
            background: "#0c0c0c",
            padding: "20px",
            borderRadius: "10px",
            width: "400px",
            maxWidth: "90%",
            border: "1px solid white",
            boxShadow: "0 4px 12px rgba(250,51,86,0.3)",
            inset: "unset",
            color: "white",
          },
        }}
      >
        <div style={{ marginBottom: "15px" }}>
          <textarea
            value={svgText}
            onChange={(e) => setSvgText(e.target.value)}
            placeholder="Paste SVG markup or upload file"
            rows={6}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid white",
              borderRadius: "5px",
              background: "#1b1b1b",
              color: "white",
              marginBottom: "10px",
            }}
          />
          <button
            style={{
              width: "100%",
              padding: "10px",
              background: "#1b1b1b",
              border: "1px solid white",
              borderRadius: "5px",
              color: "white",
              cursor: "pointer",
            }}
            onClick={() => inputRef.current?.click()}
          >
            {file ? file.name : "Upload SVG"}
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={onAddSvg}
            disabled={!svgText.trim()}
            style={{
              flex: 1,
              padding: "10px",
              background: svgText.trim() ? "#FA3356" : "#555",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: svgText.trim() ? "pointer" : "not-allowed",
              marginRight: "10px",
            }}
          >
            Add SVG
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              flex: 1,
              padding: "10px",
              background: "transparent",
              border: "1px solid white",
              borderRadius: "5px",
              color: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </ReactModal>
    </div>
  );
}