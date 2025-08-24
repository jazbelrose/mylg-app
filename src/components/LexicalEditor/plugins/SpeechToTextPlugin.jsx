import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { AudioOutlined, AudioFilled } from '@ant-design/icons';
import { TOGGLE_SPEECH_COMMAND } from '../commands';

export default function SpeechToTextPlugin({ showToolbarButton = true }) {
  const [editor] = useLexicalComposerContext();
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
      .slice(event.resultIndex)
        .map((result) => result[0].transcript)
        .join(' ');
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(transcript + ' ');
        } else {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(transcript + ' '));
          $getRoot().append(paragraph);
        }
      });
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
    };
  }, [editor]);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    if (listening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error('Speech recognition start error:', e);
        return;
      }
    }
    setListening(!listening);
  }, [listening]);

  useEffect(() => {
    return editor.registerCommand(
      TOGGLE_SPEECH_COMMAND,
      () => {
        toggleListening();
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, toggleListening]);

  return (
    showToolbarButton && (
      <button
        type="button"
        onClick={toggleListening}
        className="toolbar-item"
        aria-label="Voice Input"
      >
        {listening ? (
          <AudioFilled style={{ fontSize: 18, color: '#c00' }} />
        ) : (
          <AudioOutlined style={{ fontSize: 18, color: '#777' }} />
        )}
      </button>
    )
  );
}