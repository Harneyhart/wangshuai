'use server';

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { pdfToText } from 'pdf-ts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const systemPrompt = `
你是一个助手，请根据提供的PDF文档内容回答用户的问题。如果遇到数据公示，请使用katex语法，在公式两边各添加$$符号来表示。如果问题无法从文档内容中找到答案，请说明无法回答。
`;

// 读取并解析单个PDF文件
async function readPdfFile(key: string): Promise<string> {
  console.log('key', key);
  const filePath = path.join('./upload', key);
  console.log('filePath', filePath);
  if (!fs.existsSync(filePath)) {
    console.log('文件不存在:', filePath);
    throw new Error(`文件不存在: ${key}`);
  }
  const dataBuffer = fs.readFileSync(filePath);
  console.log('dataBuffer', dataBuffer);
  const pdfData = await pdfToText(dataBuffer);
  console.log('pdfData', pdfData);
  return pdfData;
}

export async function analyzePdfContent(pdfKeys: string[], question: string) {
  console.log('开始分析PDF内容 >>>>>>>>>>>>>');
  try {
    console.log('pdfKeys:', pdfKeys);
    console.log('question:', question);

    if (!Array.isArray(pdfKeys) || pdfKeys.length === 0 || !question) {
      return {
        code: 1,
        msg: '请提供PDF文件key数组和问题',
      };
    }

    // 读取所有PDF文件的内容
    const pdfContents = await Promise.all(
      pdfKeys.map(async (key) => {
        try {
          return await readPdfFile(key);
        } catch (error) {
          console.error(`处理文件 ${key} 时出错:`, error);
          return ''; // 如果单个文件失败，返回空字符串继续处理其他文件
        }
      }),
    );

    // 合并所有PDF内容
    const combinedContent = pdfContents
      .filter((content) => content)
      .join('\n\n--- 新文档 ---\n\n');

    if (!combinedContent) {
      return {
        code: 1,
        msg: '没有成功读取任何PDF文件内容',
      };
    }

    // 发送到AI进行问答
    const completion = await openai.chat.completions.create({
      model: 'qwen-max-latest',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `文档内容：${combinedContent}\n\n问题：${question}`,
        },
      ],
    });

    const answer = completion.choices[0].message.content || '';

    return {
      code: 0,
      msg: 'ok',
      data: {
        answer,
        processedFiles: pdfKeys.length,
        successfulFiles: pdfContents.filter((content) => content).length,
      },
    };
  } catch (error) {
    console.error('PDF处理错误:', error);
    return {
      code: 1,
      msg: '处理PDF文件时出错',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
