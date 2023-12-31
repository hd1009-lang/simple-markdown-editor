'use client'
import React, { useEffect, useRef, useState } from "react";
import ToolbarMarkdown from "@/components/Editor/toolbar";
interface Props {
  data?: string;
}
const MarkdownEditor: React.FC<Props> = ({ data }) => {
  const editorElmRef = useRef<HTMLTextAreaElement | null>(null);
  const countElementRef = useRef<HTMLSpanElement | null>(null);
  const [status, setStatus] = useState<"LOADING" | "END">("LOADING");
  const handleWriteBlog = () => {
    if (editorElmRef.current && countElementRef.current) {
      let value = editorElmRef.current.value;
      if (value && value.length >= 10000) {
        value = value.slice(0, 10000);
        editorElmRef.current.value = value;
        countElementRef.current.style.color = "#E40606";
      } else {
        countElementRef.current.style.color = "#BFBFBF";
      }
      if (value && value.length) {
        countElementRef.current.innerText = `${value.length}/10000`;
      } else {
        countElementRef.current.innerText = "";
      }
    
    }
  };
  useEffect(() => {
    if (editorElmRef.current && data && countElementRef.current) {
      editorElmRef.current.value = data;
      if (data && data.length) {
        countElementRef.current.innerText = `${data.length}/10000`;
      } else {
        countElementRef.current.innerText = "";
      }
      if (data && data.length >= 10000) {
        countElementRef.current.style.color = "#E40606";
      } else {
        countElementRef.current.style.color = "#BFBFBF";
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  useEffect(() => {
    if (editorElmRef.current && countElementRef.current) {
      setStatus("END");
    }
  }, []);
  return (
    <>
      {status === "END" && <ToolbarMarkdown editor={editorElmRef.current} />}
      <div className="w-full h-full px-24 bg-gray-200 flex flex-col">
        <textarea
          ref={editorElmRef}
          className="mt-4 w-full h-[calc(100%_-_50px)] outline-none resize-none p-8 pb-5 text-black"
          onChange={handleWriteBlog}
        />
        <div className="h-[50px] w-full bg-white flex justify-end pr-4 text-black text-xs leading-[1.125rem]">
          <span ref={countElementRef}></span>
        </div>
      </div>
    </>
  );
};

export default MarkdownEditor;
