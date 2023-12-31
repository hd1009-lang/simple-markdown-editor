// This code based on https://github.com/github/markdown-toolbar-element
import type {
  Newlines,
  SelectionRange,
  Style,
  StyleArgs,
  UndoResult,
} from "@/components/Editor/types";
import { uploadFile } from "@/services/editor";

const manualStyles = {
  "header-1": { prefix: "# " },
  "header-2": { prefix: "## " },
  "header-3": { prefix: "### " },
  "header-4": { prefix: "#### " },
  "header-5": { prefix: "##### " },
  "header-6": { prefix: "###### " },
  bold: { prefix: "**", suffix: "**", trimFirst: true },
  italic: { prefix: "*", suffix: "*", trimFirst: true },
  quote: { prefix: "> ", multiline: true, surroundWithNewlines: true },
  code: {
    prefix: "```\n",
    suffix: "\n```\n",
    blockPrefix: "```\n",
    blockSuffix: "\n```\n",
  },
  link: {
    prefix: "[",
    suffix: "](url)",
    replaceNext: "url",
    scanFor: "https?://",
  },
  image: {
    prefix: "![",
    suffix: "](url)",
    replaceNext: "url",
    scanFor: "https?://",
  },
  "unordered-list": {
    prefix: "- ",
    multiline: true,
    unorderedList: true,
  },
  "ordered-list": {
    prefix: "1. ",
    multiline: true,
    orderedList: true,
  },
  "task-list": {
    prefix: "- [ ] ",
    multiline: true,
    surroundWithNewlines: true,
  },
  mention: { prefix: "@", prefixSpace: true },
  ref: { prefix: "#", prefixSpace: true },
  strikethrough: { prefix: "~~", suffix: "~~", trimFirst: true },
  table: {
    prefix:
      "| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Text     | Text     | Text     |",
    surroundWithNewlines: true,
    trimFirst: true,
    prefixSpace: true,
  },
} as const;

function applyStyle(editor: HTMLTextAreaElement, stylesToApply: Style) {
  const defaults = {
    prefix: "",
    suffix: "",
    blockPrefix: "",
    blockSuffix: "",
    multiline: false,
    replaceNext: "",
    prefixSpace: false,
    scanFor: "",
    surroundWithNewlines: false,
    orderedList: false,
    unorderedList: false,
    trimFirst: false,
  };

  const style = { ...defaults, ...stylesToApply };
  editor.focus();
  styleSelectedText(editor, style);
}
function expandSelectionToLine(textarea: HTMLTextAreaElement) {
  const lines = textarea.value.split("\n");
  let counter = 0;
  for (let index = 0; index < lines.length; index++) {
    const lineLength = lines[index].length + 1;
    if (
      textarea.selectionStart >= counter &&
      textarea.selectionStart < counter + lineLength
    ) {
      textarea.selectionStart = counter;
    }
    if (
      textarea.selectionEnd >= counter &&
      textarea.selectionEnd < counter + lineLength
    ) {
      textarea.selectionEnd = counter + lineLength - 1;
    }
    counter += lineLength;
  }
}
function undoOrderedListStyle(text: string): UndoResult {
  const lines = text.split("\n");
  const orderedListRegex = /^\d+\.\s+/;
  const shouldUndoOrderedList = lines.every((line) =>
    orderedListRegex.test(line)
  );
  let result = lines;
  if (shouldUndoOrderedList) {
    result = lines.map((line) => line.replace(orderedListRegex, ""));
  }

  return {
    text: result.join("\n"),
    processed: shouldUndoOrderedList,
  };
}
function undoUnorderedListStyle(text: string): UndoResult {
  const lines = text.split("\n");
  const unorderedListPrefix = "- ";
  const shouldUndoUnorderedList = lines.every((line) =>
    line.startsWith(unorderedListPrefix)
  );
  let result = lines;
  if (shouldUndoUnorderedList) {
    result = lines.map((line) =>
      line.slice(unorderedListPrefix.length, line.length)
    );
  }

  return {
    text: result.join("\n"),
    processed: shouldUndoUnorderedList,
  };
}
function clearExistingListStyle(
  style: StyleArgs,
  selectedText: string
): [UndoResult, UndoResult, string] {
  let undoResultOpositeList: UndoResult;
  let undoResult: UndoResult;
  let pristineText;
  if (style.orderedList) {
    undoResult = undoOrderedListStyle(selectedText);
    undoResultOpositeList = undoUnorderedListStyle(undoResult.text);
    pristineText = undoResultOpositeList.text;
  } else {
    undoResult = undoUnorderedListStyle(selectedText);
    undoResultOpositeList = undoOrderedListStyle(undoResult.text);
    pristineText = undoResultOpositeList.text;
  }
  return [undoResult, undoResultOpositeList, pristineText];
}
function makePrefix(index: number, unorderedList: boolean): string {
  if (unorderedList) {
    return "- ";
  } else {
    return `${index + 1}. `;
  }
}
function repeat(string: string, n: number): string {
  return Array(n + 1).join(string);
}
function isMultipleLines(string: string): boolean {
  return string.trim().split("\n").length > 1;
}
function newlinesToSurroundSelectedText(
  textarea: HTMLTextAreaElement
): Newlines {
  const beforeSelection = textarea.value.slice(0, textarea.selectionStart);
  const afterSelection = textarea.value.slice(textarea.selectionEnd);

  const breaksBefore = beforeSelection.match(/\n*$/);
  const breaksAfter = afterSelection.match(/^\n*/);
  const newlinesBeforeSelection = breaksBefore ? breaksBefore[0].length : 0;
  const newlinesAfterSelection = breaksAfter ? breaksAfter[0].length : 0;

  let newlinesToAppend;
  let newlinesToPrepend;

  if (beforeSelection.match(/\S/) && newlinesBeforeSelection < 2) {
    newlinesToAppend = repeat("\n", 2 - newlinesBeforeSelection);
  }

  if (afterSelection.match(/\S/) && newlinesAfterSelection < 2) {
    newlinesToPrepend = repeat("\n", 2 - newlinesAfterSelection);
  }

  if (newlinesToAppend == null) {
    newlinesToAppend = "";
  }

  if (newlinesToPrepend == null) {
    newlinesToPrepend = "";
  }

  return { newlinesToAppend, newlinesToPrepend };
}
function wordSelectionStart(text: string, i: number): number {
  let index = i;
  while (
    text[index] &&
    text[index - 1] != null &&
    !text[index - 1].match(/\s/)
  ) {
    index--;
  }
  return index;
}
let canInsertText: boolean | null = null;
function insertText(
  textarea: HTMLTextAreaElement,
  { text, selectionStart, selectionEnd }: SelectionRange
) {
  const originalSelectionStart = textarea.selectionStart;
  const before = textarea.value.slice(0, originalSelectionStart);
  const after = textarea.value.slice(textarea.selectionEnd);
  if (canInsertText === null || canInsertText === true) {
    textarea.contentEditable = "true";
    try {
      canInsertText = document.execCommand("insertText", false, text);
    } catch (error) {
      canInsertText = false;
    }
    textarea.contentEditable = "false";
  }
  if (
    canInsertText &&
    !textarea.value.slice(0, textarea.selectionStart).endsWith(text)
  ) {
    canInsertText = false;
  }

  if (!canInsertText) {
    try {
      document.execCommand("ms-beginUndoUnit");
    } catch (e) {
      // Do nothing.
    }
    textarea.value = before + text + after;
    try {
      document.execCommand("ms-endUndoUnit");
    } catch (e) {
      // Do nothing.
    }
    textarea.dispatchEvent(
      new CustomEvent("input", { bubbles: true, cancelable: true })
    );
  }

  if (selectionStart != null && selectionEnd != null) {
    textarea.setSelectionRange(selectionStart, selectionEnd);
  } else {
    textarea.setSelectionRange(originalSelectionStart, textarea.selectionEnd);
  }
}
function wordSelectionEnd(text: string, i: number, multiline: boolean): number {
  let index = i;
  const breakpoint = multiline ? /\n/ : /\s/;
  while (text[index] && !text[index].match(breakpoint)) {
    index++;
  }
  return index;
}
function expandSelectedText(
  textarea: HTMLTextAreaElement,
  prefixToUse: string,
  suffixToUse: string,
  multiline = false
): string {
  if (textarea.selectionStart === textarea.selectionEnd) {
    textarea.selectionStart = wordSelectionStart(
      textarea.value,
      textarea.selectionStart
    );
    textarea.selectionEnd = wordSelectionEnd(
      textarea.value,
      textarea.selectionEnd,
      multiline
    );
  } else {
    const expandedSelectionStart = textarea.selectionStart - prefixToUse.length;
    const expandedSelectionEnd = textarea.selectionEnd + suffixToUse.length;
    const beginsWithPrefix =
      textarea.value.slice(expandedSelectionStart, textarea.selectionStart) ===
      prefixToUse;
    const endsWithSuffix =
      textarea.value.slice(textarea.selectionEnd, expandedSelectionEnd) ===
      suffixToUse;
    if (beginsWithPrefix && endsWithSuffix) {
      textarea.selectionStart = expandedSelectionStart;
      textarea.selectionEnd = expandedSelectionEnd;
    }
  }
  return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
}
function blockStyle(
  textarea: HTMLTextAreaElement,
  arg: StyleArgs
): SelectionRange {
  let newlinesToAppend;
  let newlinesToPrepend;

  const {
    prefix,
    suffix,
    blockPrefix,
    blockSuffix,
    replaceNext,
    prefixSpace,
    scanFor,
    surroundWithNewlines,
  } = arg;
  const originalSelectionStart = textarea.selectionStart;
  const originalSelectionEnd = textarea.selectionEnd;

  let selectedText = textarea.value.slice(
    textarea.selectionStart,
    textarea.selectionEnd
  );
  let prefixToUse =
    isMultipleLines(selectedText) && blockPrefix.length > 0
      ? `${blockPrefix}\n`
      : prefix;
  let suffixToUse =
    isMultipleLines(selectedText) && blockSuffix.length > 0
      ? `\n${blockSuffix}`
      : suffix;
  if (prefixSpace) {
    const beforeSelection = textarea.value[textarea.selectionStart - 1];
    if (
      textarea.selectionStart !== 0 &&
      beforeSelection != null &&
      !beforeSelection.match(/\s/)
    ) {
      prefixToUse = ` ${prefixToUse}`;
    }
  }
  selectedText = expandSelectedText(
    textarea,
    prefixToUse,
    suffixToUse,
    arg.multiline
  );
  let selectionStart = textarea.selectionStart;
  let selectionEnd = textarea.selectionEnd;
  const hasReplaceNext =
    replaceNext.length > 0 &&
    suffixToUse.indexOf(replaceNext) > -1 &&
    selectedText.length > 0;
  if (surroundWithNewlines) {
    const ref = newlinesToSurroundSelectedText(textarea);
    newlinesToAppend = ref.newlinesToAppend;
    newlinesToPrepend = ref.newlinesToPrepend;
    prefixToUse = newlinesToAppend + prefix;
    suffixToUse += newlinesToPrepend;
  }

  if (
    selectedText.startsWith(prefixToUse) &&
    selectedText.endsWith(suffixToUse)
  ) {
    const replacementText = selectedText.slice(
      prefixToUse.length,
      selectedText.length - suffixToUse.length
    );
    if (originalSelectionStart === originalSelectionEnd) {
      let position = originalSelectionStart - prefixToUse.length;
      position = Math.max(position, selectionStart);
      position = Math.min(position, selectionStart + replacementText.length);
      selectionStart = selectionEnd = position;
    } else {
      selectionEnd = selectionStart + replacementText.length;
    }
    return { text: replacementText, selectionStart, selectionEnd };
  } else if (!hasReplaceNext) {
    let replacementText = prefixToUse + selectedText + suffixToUse;
    selectionStart = originalSelectionStart + prefixToUse.length;
    selectionEnd = originalSelectionEnd + prefixToUse.length;
    const whitespaceEdges = selectedText.match(/^\s*|\s*$/g);
    if (arg.trimFirst && whitespaceEdges) {
      const leadingWhitespace = whitespaceEdges[0] || "";
      const trailingWhitespace = whitespaceEdges[1] || "";
      replacementText =
        leadingWhitespace +
        prefixToUse +
        selectedText.trim() +
        suffixToUse +
        trailingWhitespace;
      selectionStart += leadingWhitespace.length;
      selectionEnd -= trailingWhitespace.length;
    }
    return { text: replacementText, selectionStart, selectionEnd };
  } else if (scanFor.length > 0 && selectedText.match(scanFor)) {
    suffixToUse = suffixToUse.replace(replaceNext, selectedText);
    const replacementText = prefixToUse + suffixToUse;
    selectionStart = selectionEnd = selectionStart + prefixToUse.length;
    return { text: replacementText, selectionStart, selectionEnd };
  } else {
    const replacementText = prefixToUse + selectedText + suffixToUse;
    selectionStart =
      selectionStart +
      prefixToUse.length +
      selectedText.length +
      suffixToUse.indexOf(replaceNext);
    selectionEnd = selectionStart + replaceNext.length;
    return { text: replacementText, selectionStart, selectionEnd };
  }
}
function listStyle(
  textarea: HTMLTextAreaElement,
  style: StyleArgs
): SelectionRange {
  const noInitialSelection = textarea.selectionStart === textarea.selectionEnd;
  let selectionStart = textarea.selectionStart;
  let selectionEnd = textarea.selectionEnd;

  // Select whole line
  expandSelectionToLine(textarea);

  const selectedText = textarea.value.slice(
    textarea.selectionStart,
    textarea.selectionEnd
  );

  // If the user intent was to do an undo, we will stop after this.
  // Otherwise, we will still undo to other list type to prevent list stacking
  const [undoResult, undoResultOpositeList, pristineText] =
    clearExistingListStyle(style, selectedText);

  const prefixedLines = pristineText.split("\n").map((value, index) => {
    return `${makePrefix(index, style.unorderedList)}${value}`;
  });

  const totalPrefixLength = prefixedLines.reduce(
    (previousValue, _currentValue, currentIndex) => {
      return (
        previousValue + makePrefix(currentIndex, style.unorderedList).length
      );
    },
    0
  );

  const totalPrefixLengthOpositeList = prefixedLines.reduce(
    (previousValue, _currentValue, currentIndex) => {
      return (
        previousValue + makePrefix(currentIndex, !style.unorderedList).length
      );
    },
    0
  );

  if (undoResult.processed) {
    if (noInitialSelection) {
      selectionStart = Math.max(
        selectionStart - makePrefix(0, style.unorderedList).length,
        0
      );
      selectionEnd = selectionStart;
    } else {
      selectionStart = textarea.selectionStart;
      selectionEnd = textarea.selectionEnd - totalPrefixLength;
    }
    return { text: pristineText, selectionStart, selectionEnd };
  }

  const { newlinesToAppend, newlinesToPrepend } =
    newlinesToSurroundSelectedText(textarea);
  const text = newlinesToAppend + prefixedLines.join("\n") + newlinesToPrepend;

  if (noInitialSelection) {
    selectionStart = Math.max(
      selectionStart +
        makePrefix(0, style.unorderedList).length +
        newlinesToAppend.length,
      0
    );
    selectionEnd = selectionStart;
  } else {
    if (undoResultOpositeList.processed) {
      selectionStart = Math.max(
        textarea.selectionStart + newlinesToAppend.length,
        0
      );
      selectionEnd =
        textarea.selectionEnd +
        newlinesToAppend.length +
        totalPrefixLength -
        totalPrefixLengthOpositeList;
    } else {
      selectionStart = Math.max(
        textarea.selectionStart + newlinesToAppend.length,
        0
      );
      selectionEnd =
        textarea.selectionEnd + newlinesToAppend.length + totalPrefixLength;
    }
  }

  return { text, selectionStart, selectionEnd };
}
function multilineStyle(textarea: HTMLTextAreaElement, arg: StyleArgs) {
  const { prefix, suffix, surroundWithNewlines } = arg;
  let text = textarea.value.slice(
    textarea.selectionStart,
    textarea.selectionEnd
  );
  let selectionStart = textarea.selectionStart;
  let selectionEnd = textarea.selectionEnd;
  const lines = text.split("\n");
  const undoStyle = lines.every(
    (line) => line.startsWith(prefix) && line.endsWith(suffix)
  );

  if (undoStyle) {
    text = lines
      .map((line) => line.slice(prefix.length, line.length - suffix.length))
      .join("\n");
    selectionEnd = selectionStart + text.length;
  } else {
    text = lines.map((line) => prefix + line + suffix).join("\n");
    if (surroundWithNewlines) {
      const { newlinesToAppend, newlinesToPrepend } =
        newlinesToSurroundSelectedText(textarea);
      selectionStart += newlinesToAppend.length;
      selectionEnd = selectionStart + text.length;
      text = newlinesToAppend + text + newlinesToPrepend;
    }
  }

  return { text, selectionStart, selectionEnd };
}
function styleSelectedText(
  textarea: HTMLTextAreaElement,
  styleArgs: StyleArgs
) {
  const text = textarea.value.slice(
    textarea.selectionStart,
    textarea.selectionEnd
  );

  let result;
  if (styleArgs.orderedList || styleArgs.unorderedList) {
    result = listStyle(textarea, styleArgs);
  } else if (styleArgs.multiline && isMultipleLines(text)) {
    result = multilineStyle(textarea, styleArgs);
  } else {
    result = blockStyle(textarea, styleArgs);
  }
  insertText(textarea, result);
}
// Refactor to match my level
export const handleBold = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles.bold);
  }
};
export const handleItalic = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles.italic);
  }
};
export const handleOrderList = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles["ordered-list"]);
  }
};
export const handleUnOrderList = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles["unordered-list"]);
  }
};
export const handleHeader = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    editor.focus();
    const selectionStart = editor.selectionStart;
    const text = editor.value;
    const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
    let lineEnd = text.indexOf("\n", selectionStart);
    if (lineEnd === -1) {
      lineEnd = text.length;
    }
    let currentLineValue = text.substring(lineStart, lineEnd);
    const currentLength = text.substring(
      0,
      lineStart + currentLineValue.length
    ).length;
    const currHeadingLevel = currentLineValue.search(/[^#]/);
    if (currHeadingLevel <= 0) {
      currentLineValue = "## " + currentLineValue;
    } else if (currHeadingLevel === 4) {
      currentLineValue = currentLineValue.substr(5);
    } else {
      currentLineValue = "#" + currentLineValue;
    }
    editor.selectionStart = lineStart;
    editor.selectionEnd = currentLength;
    insertText(editor, {
      text: currentLineValue,
      selectionStart: lineStart,
      selectionEnd: currentLength,
    });
    editor.selectionStart = lineStart + currentLineValue.search(/[^#]/);
    editor.selectionEnd = lineStart + currentLineValue.length;
  }
};
export const handleStrikeThrough = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles.strikethrough);
  }
};
export const handleLink = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles.link);
  }
};
export const handleQuote = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles.quote);
  }
};
export const handleCode = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles.code);
  }
};
export const handleTable = (editor: HTMLTextAreaElement | null) => {
  if (editor !== null) {
    applyStyle(editor, manualStyles.table);
  }
};
export const handleImg = async (
  editor: HTMLTextAreaElement | null,
  data: FormData
) => {
  if (editor !== null) {
    editor.focus();
    const selectionStart = editor.selectionStart;
    insertText(editor, {
      text: "![Loading...](url)",
      selectionStart: selectionStart,
      selectionEnd: selectionStart,
    });
    try {
      const dataImg = await uploadFile(data);
      if (dataImg && dataImg.url) {
        const dataReplace = `![img](${dataImg.url})`;
        editor.selectionStart = selectionStart;
        editor.selectionEnd = selectionStart + 18;
        insertText(editor, {
          text: `![img](${dataImg.url})`,
          selectionStart: selectionStart - 18,
          selectionEnd: selectionStart - 18 + dataReplace.length,
        });
        editor.selectionStart = selectionStart + dataReplace.length;
        editor.selectionEnd = selectionStart + dataReplace.length;
      }
    } catch (error) {
      editor.selectionStart = selectionStart;
      editor.selectionEnd = selectionStart + 18;
      insertText(editor, {
        text: "",
        selectionStart: selectionStart,
        selectionEnd: selectionStart,
      });
      throw error;
    }
  }
};
