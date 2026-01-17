"use client";

import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { usePathname } from "next/navigation";

interface CodeEditorProps {
  selectedUDF: string;
  loading?: boolean;
  onCodeChange?: (code: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  selectedUDF,
  loading = false,
  onCodeChange,
}) => {
  const pathname = usePathname() ?? "";

  const onChange = React.useCallback(
    (value: string) => {
      if (onCodeChange) {
        onCodeChange(value);
      }
    },
    [onCodeChange],
  );

  const isEditUDFPage = pathname.includes("/edit-udf");

  if (loading) {
    return (
      <div className="flex-1 bg-[#1e1e1e] rounded overflow-hidden">
        <div className="flex justify-center items-center h-full text-neutral-500 text-14 bg-[#1e1e1e]">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex-1 bg-[#1e1e1e] rounded overflow-hidden h-full">
        <CodeMirror
          value={selectedUDF}
          height={isEditUDFPage ? "60vh" : "77vh"}
          theme={oneDark}
          extensions={[python()]}
          editable={isEditUDFPage}
          onChange={isEditUDFPage ? onChange : undefined}
          className="h-full"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
