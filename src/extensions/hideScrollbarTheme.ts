import { EditorView } from "@codemirror/view";

export const hideScrollbarTheme = EditorView.theme({
  ".cm-scroller": {
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  ".cm-scroller::-webkit-scrollbar": {
    display: "none",
  },
});
