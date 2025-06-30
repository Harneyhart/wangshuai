import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fileTypeFromBlob } from 'file-type';

import fs from 'node:fs/promises';
import { generateId } from 'lucia';

export type UploadFileItem = {
  fileName: string;
  fileKey: string;
};
export type UploadResponse = {
  status: 'success' | 'fail';
  data?: UploadFileItem;
  error?: any;
};

export async function POST(
  req: Request,
): Promise<NextResponse<UploadResponse>> {
  try {
    console.log('>>>>>>>>>>>11');
    const formData = await req.formData();
    console.log('formData', formData);

    const file = formData.get('file') as File;
    console.log('file', file);
    // return;
    let ext = file.name.split('.').pop();
    // 获取文件后缀名
    const fileType = await fileTypeFromBlob(file);
    console.log('file.name', file.name);
    if (fileType) {
      ext = fileType.ext;
    }
    // 生成随机文件名
    const newFileName = `${Date.now()}-${generateId(5)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    // 检查本地是否有 upload 文件夹，没有则创建
    try {
      await fs.access('./upload');
    } catch (e) {
      await fs.mkdir('./upload');
    }
    await fs.writeFile(`./upload/${newFileName}`, buffer);

    revalidatePath('/');

    return NextResponse.json({
      status: 'success',
      data: { fileName: file.name, fileKey: newFileName },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ status: 'fail', error: e });
  }
}
