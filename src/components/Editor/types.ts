export interface SelectionRange {
  text: string;
  selectionStart: number | undefined;
  selectionEnd: number | undefined;
}
export type Style = {
  prefix?: string;
  suffix?: string;
  trimFirst?: boolean;
  multiline?: boolean;
  surroundWithNewlines?: boolean;
  blockPrefix?: string;
  blockSuffix?: string;
  replaceNext?: string;
  scanFor?: string;
  orderedList?: boolean;
  unorderedList?: boolean;
  prefixSpace?: boolean;
};
export interface StyleArgs {
  prefix: string;
  suffix: string;
  blockPrefix: string;
  blockSuffix: string;
  multiline: boolean;
  replaceNext: string;
  prefixSpace: boolean;
  scanFor: string;
  surroundWithNewlines: boolean;
  orderedList: boolean;
  unorderedList: boolean;
  trimFirst: boolean;
}
export interface UndoResult {
  text: string;
  processed: boolean;
}
export interface Newlines {
  newlinesToAppend: string;
  newlinesToPrepend: string;
}
