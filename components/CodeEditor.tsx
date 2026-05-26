"use client";

import Editor, { BeforeMount, OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useMemo } from "react";
import { useAlgoStore } from "@/store/useAlgoStore";

export default function CodeEditor() {
  const code = useAlgoStore((state) => state.code);
  const setCode = useAlgoStore((state) => state.setCode);
  const language = useAlgoStore((state) => state.language);

  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Cascadia Mono', 'SFMono-Regular', Consolas, Menlo, Monaco, 'Liberation Mono', 'Courier New', monospace",
      fontSize: 21,
      lineHeight: 30,
      minimap: { enabled: false },
      glyphMargin: true,
      folding: true,
      guides: {
        indentation: true,
        bracketPairs: true,
      },
      bracketPairColorization: { enabled: true },
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 0, bottom: 28 },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      lineNumbersMinChars: 4,
      renderLineHighlight: "all",
      overviewRulerBorder: false,
      scrollbar: {
        verticalScrollbarSize: 14,
        horizontalScrollbarSize: 14,
      },
    }),
    [],
  );

  const defineCodeflowTheme: BeforeMount = (monaco) => {
    monaco.editor.defineTheme("codeflow-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "4ea1ff" },
        { token: "number", foreground: "facc15" },
        { token: "string", foreground: "f59e8b" },
        { token: "type.identifier", foreground: "70d6ff" },
      ],
      colors: {
        "editor.background": "#151515",
        "editor.foreground": "#f4f4f5",
        "editorLineNumber.foreground": "#9ca3af",
        "editorLineNumber.activeForeground": "#e5e7eb",
        "editorIndentGuide.background1": "#3a3a3a",
        "editorIndentGuide.activeBackground1": "#626262",
        "editor.lineHighlightBackground": "#202020",
        "editor.lineHighlightBorder": "#2b2b2b",
        "editorCursor.foreground": "#ffffff",
        "editor.selectionBackground": "#335f8f66",
        "editorGutter.background": "#151515",
      },
    });
  };

  const handleMount: OnMount = (editorInstance, monaco) => {
    defineCodeflowTheme(monaco);
    monaco.editor.setTheme("codeflow-dark");
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#151515]">
      <Editor
        height="100%"
        beforeMount={defineCodeflowTheme}
        language={monacoLanguage(language)}
        value={code}
        options={options}
        onChange={(value) => setCode(value ?? "")}
        onMount={handleMount}
        theme="codeflow-dark"
      />
    </div>
  );
}

function monacoLanguage(language: string) {
  const languages: Record<string, string> = {
    "C++": "cpp",
    Java: "java",
    Python: "python",
    JavaScript: "javascript",
  };

  return languages[language] ?? "cpp";
}
