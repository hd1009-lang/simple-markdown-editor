import React, { useMemo, useState } from "react";
import BoldIcon from "@/components/Editor/icon/bold.svg";
import ItalicIcon from "@/components/Editor/icon/italic.svg";
import StrikethroughIcon from "@/components/Editor/icon/strikethrough.svg";
import HeadingIcon from "@/components/Editor/icon/heading.svg";
import OrderListIcon from "@/components/Editor/icon/orderList.svg";
import LinkIcon from "@/components/Editor/icon/link.svg";
import QuoteIcon from "@/components/Editor/icon/quotes.svg";
import UnOrderListIcon from "@/components/Editor/icon/unOrderList.svg";
import CodeIcon from "@/components/Editor/icon/codeSnippet.svg";
import TableIcon from "@/components/Editor/icon/table.svg";
import ImageIcon from "@/components/Editor/icon/image.svg";

import Image from "next/image";
import {
  handleBold,
  handleItalic,
  handleOrderList,
  handleHeader,
  handleStrikeThrough,
  handleLink,
  handleQuote,
  handleUnOrderList,
  handleCode,
  handleTable,
  handleImg,
} from "./script";
import { isValidImg } from "@/utils/editor";

interface Props {
  editor: HTMLTextAreaElement | null;
}
const ToolbarMarkdown: React.FC<Props> = ({ editor }) => {
  const handleInput = () => {
    const newInputFile = document.createElement("input");
    newInputFile.type = "file";
    newInputFile.accept = ".png, .jpg, .jpeg, .gif";
    newInputFile.click();
    newInputFile.addEventListener("change", async () => {
      if (newInputFile.files && newInputFile.files[0]) {
        const file = newInputFile.files[0];
        const isValid = isValidImg(file);
        if (isValid) {
          const body = new FormData();
          const file = newInputFile.files[0];
          body.append("file", file);
          body.append("upload_preset", `${process.env.NEXT_PUBLIC_UPLOAD_PRESET}`);
          body.append("cloud_name", `${process.env.NEXT_PUBLIC_CLOUD_NAME}`);
          try {
            const res = await handleImg(editor, body);
            console.log(res);
          } catch (error) {
            alert("Some thing wrong");
          }
        }
      }
    });
  };
  const toolbar = useMemo(() => {
    return [
      {
        icon: BoldIcon,
        name: "Bold",
        action: () => handleBold(editor),
      },
      {
        icon: ItalicIcon,
        name: "Italic",
        action: () => handleItalic(editor),
      },
      {
        icon: StrikethroughIcon,
        name: "strikethrough",
        action: () => handleStrikeThrough(editor),
      },
      {
        icon: HeadingIcon,
        name: "heading",
        action: () => handleHeader(editor),
      },
      {
        icon: "",
        name: "lineBreak",
        action: () => {},
      },
      {
        icon: LinkIcon,
        name: "link",
        action: () => handleLink(editor),
      },
      {
        icon: CodeIcon,
        name: "code snippet",
        action: () => handleCode(editor),
      },
      {
        icon: QuoteIcon,
        name: "quote",
        action: () => handleQuote(editor),
      },
      {
        icon: "",
        name: "lineBreak",
        action: () => {},
      },
      {
        icon: UnOrderListIcon,
        name: "UnOrder list",
        action: () => handleUnOrderList(editor),
      },
      {
        icon: OrderListIcon,
        name: "Order list",
        action: () => handleOrderList(editor),
      },
      {
        icon: TableIcon,
        name: "Table",
        action: () => handleTable(editor),
      },
      {
        icon: ImageIcon,
        name: "Img",
        action: () => handleInput(),
      },
      {
        icon: "",
        name: "lineBreak",
        action: () => {},
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
  return (
    <div className="w-full flex items-center justify-start py-4 pl-24">
      {toolbar.map((tool, idx) => {
        if (tool.name === "lineBreak") {
          return (
            <div
              key={tool.name + idx}
              className="w-[0.0625rem] h-5 bg-gray-400 mr-4"
            ></div>
          );
        }
        return (
          <button
            className="mr-4"
            key={tool.name}
            onClick={() => tool.action()}
          >
            <Image
              src={tool.icon}
              className="w-6 h-6 object-contain"
              width={24}
              height={24}
              alt={tool.name}
              priority
            />
          </button>
        );
      })}
    </div>
  );
};

export default ToolbarMarkdown;
