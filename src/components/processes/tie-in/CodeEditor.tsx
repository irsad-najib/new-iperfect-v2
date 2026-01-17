// src/components/JsonEditor.tsx
import React, { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import type { Extension } from "@codemirror/state";
import { highlightWords } from "@/codemirror/highlightWords";
import { hideScrollbarTheme } from "@/extensions/hideScrollbarTheme";

interface JsonEditorProps {
  value: string;
  onChange: (val: string) => void;
  highlightTerms?: string[]; // words or patterns to highlight
  extraExtensions?: Extension[]; // any other CM extensions you want
  readOnly?: boolean;
}

export const CodeEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  highlightTerms = [],
  extraExtensions = [],
  readOnly = false,
}) => {
  // Memoize the highlight extension so it only re‑builds when terms change
  const extensions: Extension[] = React.useMemo(() => {
    const exts: Extension[] = [python(), hideScrollbarTheme];
    if (highlightTerms.length) {
      exts.push(highlightWords(highlightTerms));
    }
    return exts.concat(extraExtensions);
  }, [highlightTerms, extraExtensions]);

  const handleChange = useCallback(
    (doc: string) => {
      onChange(doc);
    },
    [onChange]
  );

  return (
    <CodeMirror
      value={value}
      height="38rem"
      theme="light"
      extensions={extensions}
      onChange={handleChange}
      editable={!readOnly}
    />
  );
};
