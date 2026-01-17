import { Extension, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";

export function highlightWords(
  words: string[],
  className = "cm-word-highlight"
): Extension {
  // build a single regex that matches any of the words
  const pattern = new RegExp(
    `\\b(${words.map((w) => escapeRegExp(w)).join("|")})\\b`,
    "g"
  );

  // ViewPlugin that re-scans the document on every change
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecos(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecos(update.view);
        }
      }

      buildDecos(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to);
          let m: RegExpExecArray | null;
          while ((m = pattern.exec(text))) {
            const start = from + m.index;
            const end = start + m[0].length;
            builder.add(start, end, Decoration.mark({ class: className }));
          }
        }
        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

  return [
    plugin,
    // Add default styling; you can override in your CSS too
    EditorView.baseTheme({
      [`.cm-word-highlight`]: {
        // backgroundColor: "rgba(244, 121, 32, 1)",
        color: "rgba(244, 121, 32, 1)",
        borderRadius: "2px",
      },
    }),
  ];
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
