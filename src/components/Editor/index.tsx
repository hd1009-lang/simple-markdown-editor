"use client";
import React, { useEffect, useRef, useState } from "react";
import ToolbarMarkdown from "@/components/Editor/toolbar";
import markdownit from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.min.css";
import MarkdownIt from "markdown-it";
import styles from "@/components/Editor/style.module.css";
import classNames from "classnames";
import { PLACEHOLDER } from "@/utils/placeholder";
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
  const [preview, setPreview] = useState<string>("");
  return (
    <>
      {status === "END" && (
        <div className="flex justify-start items-center">
          <ToolbarMarkdown editor={editorElmRef.current} />
          <div
            onClick={() => {
              if (preview) {
                setPreview("");
                return;
              }
              if (editorElmRef.current && !preview) {
                const md: MarkdownIt = markdownit({
                  breaks: true,
                  highlight: function (str, lang) {
                    if (lang && hljs.getLanguage(lang)) {
                      try {
                        return hljs.highlight(str, { language: lang }).value;
                      } catch (__) {}
                    }

                    return "";
                  },
                });
                setPreview(md.render(editorElmRef.current.value));
                return;
              }
            }}
            className="cursor-pointer"
          >
            Preview
          </div>
        </div>
      )}
      <div className="w-full h-full px-24 bg-gray-200 flex flex-col relative">
        <div
          className={`absolute top-4 ${
            preview ? " left-0 z-50 bg-white" : "-left-full -z-10"
          }  w-full h-full`}
        >
          <div
            className={classNames(
              styles.content,
              "overflow-auto w-full h-[calc(100%_-_70px)] px-24 bg-white"
            )}
          >
            <div
              className="prose"
              dangerouslySetInnerHTML={{
                __html: preview,
              }}
            ></div>
          </div>
        </div>
        <textarea
          ref={editorElmRef}
          className="mt-4 w-full h-[calc(100%_-_50px)] outline-none resize-none p-8 pb-5 text-black"
          onChange={handleWriteBlog}
          defaultValue={PLACEHOLDER}
        />
        <div className="h-[50px] w-full bg-white flex justify-end pr-4 text-black text-xs leading-[1.125rem]">
          <span ref={countElementRef}></span>
        </div>
      </div>
    </>
  );
};

export default MarkdownEditor;
