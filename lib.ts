import fs from "fs/promises";
import path from "path";
import jsdom from "jsdom";
import { Readability } from "@mozilla/readability";
import iconv from "iconv-lite";
import fetch, { Response } from "node-fetch";

const outputDir = "./output";

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (v) => {});

export const processUrls = async (urls: string[]) => {
  try {
    for (const url of urls) {
      const { title, content } = await extractContent(url);
      const filebase = (title || url).replace(/[ \/　]/g, "_");
      const outputFilePath = path.join(outputDir, `${filebase}.txt`);

      await fs.writeFile(outputFilePath, content);
      console.log(
        `Processed and saved content from ${url} to ${outputFilePath}`
      );
    }
  } catch (err) {
    console.error(`Error processing URLs: ${err}`);
  }
};

const extractContent = async (
  url: string
): Promise<{ title: string; content: string }> => {
  const response = await fetch(url);
  const { title: titleUTF8, content: htmlUTF8 } = await extractUTF8(response);

  if (htmlUTF8.includes("�")) {
    const { title, content } = await extractShiftJIS(response);
    return { title, content };
  }

  return { title: titleUTF8, content: htmlUTF8 };
};

const extractUTF8 = async (
  response: Response
): Promise<{ title: string; content: string }> => {
  const html = await response.arrayBuffer();
  const doc = new jsdom.JSDOM(html, {
    virtualConsole,
  });

  const reader = new Readability(doc.window.document);
  const article = reader.parse();
  const title = doc.window.document.querySelector("title")?.textContent || "";

  return {
    title,
    content: article ? article.textContent.replace(/\s+/g, "").trim() : "",
  };
};

const extractShiftJIS = async (
  response: Response
): Promise<{ title: string; content: string }> => {
  const html = await response.arrayBuffer();
  const doc = new jsdom.JSDOM(iconv.decode(Buffer.from(html), "Shift_JIS"), {
    virtualConsole,
  });

  const reader = new Readability(doc.window.document);
  const article = reader.parse();
  const title = doc.window.document.querySelector("title")?.textContent || "";

  return {
    title,
    content: article ? article.textContent.replace(/\s+/g, "").trim() : "",
  };
};
