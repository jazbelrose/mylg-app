import React, { useEffect, useRef, useState } from "react";
import ReactModal from "react-modal";
import { FileImageOutlined } from '@ant-design/icons';
import { uploadData } from "aws-amplify/storage";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createResizableImageNode } from "./nodes/ResizableImageNode";
import { $insertNodes, $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from "lexical";
import { useData } from "../../../app/contexts/DataProvider";
import { S3_PUBLIC_BASE } from "../../../utils/api";
import { OPEN_IMAGE_COMMAND } from "../commands";

// Bind modal to the app element for accessibility
if (typeof document !== 'undefined') {
  ReactModal.setAppElement("#root");
}

export default function ImagePlugin({ showToolbarButton = true }) {
  const { activeProject } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setURL] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      OPEN_IMAGE_COMMAND,
      () => {
        setIsOpen(true);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const handleFileUpload = async (file) => {
    if (!file || !activeProject?.projectId) return null;

    const filename = `projects/${activeProject.projectId}/lexical/${file.name}`;
    setIsUploading(true);

    try {
      console.log("Starting upload for file:", file.name);
      const result = await uploadData({
        key: filename,
        data: file,
        options: { accessLevel: "public" },
      }).result;

      console.log("Upload completed:", result);

      const url = `${S3_PUBLIC_BASE}/${filename}`;
      return url;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const onAddImage = async () => {
    let src = url || (file ? await handleFileUpload(file) : "");

    if (src) {
      const img = new Image();
      img.src = src;

      img.onload = () => {
        editor.update(() => {
          const node = $createResizableImageNode({
            src,
            altText: "Image",
            width: 400,
            height: 300,
          });
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([node]);
          } else {
            $insertNodes([node]);
          }
        });
      };

      img.onerror = () => console.error("Failed to load image:", src);
    }

    setFile(null);
    setURL("");
    setIsOpen(false);
  };

  return (
    <div>
      {showToolbarButton && (
        <button
          aria-label="Add Image"
          style={{
            background: isHovered ? "#eee" : "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "8px",
            transition: "background 0.3s ease",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsOpen(true)}
        >
          <FileImageOutlined style={{ fontSize: 18, color: '#777' }} />
        </button>
      )}
      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) setFile(selectedFile);
          e.target.value = null;
        }}
      />
      <ReactModal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        style={{
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.6)",
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
            boxShadow: "0 4px 12px rgba(250, 51, 86, 0.3)",
            inset: "unset",
            color: "white",
          },
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "white" }}>Add Image</h2>
          <button
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "white",
            }}
            onClick={() => setIsOpen(false)}
          >
            &times;
          </button>
        </div>
        <div style={{ marginBottom: "15px" }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setURL(e.target.value)}
            placeholder="Add Image URL"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid white",
              borderRadius: "5px",
              background: "#1b1b1b",
              color: "white",
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
            {file ? file.name : "Upload Image"}
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            onClick={onAddImage}
            disabled={(!url && !file) || isUploading || !activeProject?.projectId}
            style={{
              flex: 1,
              padding: "10px",
              background: (url || file) && !isUploading && activeProject?.projectId ? "#FA3356" : "#555",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: (url || file) && !isUploading && activeProject?.projectId ? "pointer" : "not-allowed",
              marginRight: "10px",
            }}
          >
            {isUploading ? "Uploading..." : "Add Image"}
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
              transition: "border 0.3s ease, color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.border = "1px solid #FA3356";
              e.target.style.color = "#FA3356";
            }}
            onMouseLeave={(e) => {
              e.target.style.border = "1px solid white";
              e.target.style.color = "white";
            }}
          >
            Cancel
          </button>

        </div>
      </ReactModal>
    </div>
  );
}
