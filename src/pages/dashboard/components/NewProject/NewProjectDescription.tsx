import React, { useState, useCallback } from 'react';
import Modal from '../../../../components/ModalWithStack';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import type { EditorState } from 'lexical';

const theme = {
  paragraph: 'editor-paragraph',
  text: {
    bold: 'editor-bold',
    italic: 'editor-italic',
    underline: 'editor-underline',
    strikethrough: 'editor-strikethrough',
    code: 'editor-code',
  },
};

const initialConfig = {
  namespace: 'MyEditor',
  theme,
  onError: (error: Error) => console.error(error),
};

const lexicalJSONToPlainText = (lexicalJson: string): string => {
  try {
    const parsed = JSON.parse(lexicalJson);
    if (parsed && parsed.root && parsed.root.children) {
      return parsed.root.children
        .map((child: any) => child.children?.map((node: any) => node.text || '').join('') || '')
        .join('\n');
    }
    return '';
  } catch (error) {
    console.error('Error parsing Lexical JSON:', error);
    return '';
  }
};

interface NewProjectDescriptionProps {
  description: string;
  setDescription: (value: string) => void;
}

const NewProjectDescription: React.FC<NewProjectDescriptionProps> = ({ description, setDescription }) => {
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const openDescriptionModal = () => setShowDescriptionModal(true);
  const closeDescriptionModal = () => setShowDescriptionModal(false);

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const json = JSON.stringify(editorState.toJSON());
        setDescription(json);
      });
    },
    [setDescription]
  );

  const previewText = description && description.trim().length > 0
    ? lexicalJSONToPlainText(description) || 'Edit Description'
    : 'Edit Description';

  return (
    <div className="column-new-project-description">
      <div className="dashboard-item new-project-description" onClick={openDescriptionModal}>
        <span className="after-input-description">{previewText}</span>
        {(!description || !description.trim()) && <span>+</span>}
      </div>
      <Modal
        isOpen={showDescriptionModal}
        onRequestClose={closeDescriptionModal}
        contentLabel="Project Description Modal"
        style={{
          overlay: { backgroundColor: 'rgba(0, 0, 0, 0.75)' },
          content: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            width: '90%',
            maxWidth: '400px',
            height: 'auto',
            maxHeight: '90vh',
            padding: '20px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <LexicalComposer
          initialConfig={{
            ...initialConfig,
            editorState: description && description.trim().length > 0 ? description : undefined,
          }}
        >
          <div style={{ flex: 1, overflow: 'auto' }}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input"
                  style={{ minHeight: '200px', padding: '10px', fontSize: '14px' }}
                  autoFocus
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              }
              placeholder={
                !isFocused && (
                  <div
                    className="editor-placeholder"
                    style={{
                      opacity: 0.5,
                      position: 'absolute',
                      padding: '10px',
                      fontSize: '14px',
                      color: '#ccc',
                    }}
                  >
                    Type your description...
                  </div>
                )
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <OnChangePlugin onChange={handleChange} />
          </div>
        </LexicalComposer>
        <button
          onClick={closeDescriptionModal}
          className="modal-submit-button"
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            borderRadius: '5px',
            backgroundColor: '#FA3356',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          }}
        >
          Done
        </button>
      </Modal>
    </div>
  );
};

export default NewProjectDescription;
