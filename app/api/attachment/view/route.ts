// import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const key = searchParams.get('key');
  console.log('>>>>>>>>>>>key', key);
  if (typeof key !== 'string' || key.length === 0) {
    return Response.json({ error: 'Invalid key' }, { status: 400 });
  }
  const filePath = path.join('./upload', key);
  console.log('filePath', filePath);

  if (!fs.existsSync(filePath)) {
    return Response.json({ error: 'File not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileType = getFileType(key);

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': fileType,
    },
  });
}

function getFileType(key: string): string {
  const ext = path.extname(key).toLowerCase();

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    case '.ppt':
    case '.pptx':
      return 'application/vnd.ms-powerpoint';
    case '.doc':
    case '.docx':
      return 'application/msword';
    case '.xls':
    case '.xlsx':
      return 'application/vnd.ms-excel';
    case '.txt':
      return 'text/plain';
    case '.zip':
      return 'application/zip';
    case '.mp4':
      return 'video/mp4';
    case '.mp3':
      return 'audio/mpeg';
    case '.mov':
      return 'video/quicktime';
    case '.avi':
      return 'video/x-msvideo';
    case '.mkv':
      return 'video/x-matroska';
    default:
      return 'application/octet-stream';
  }
}
