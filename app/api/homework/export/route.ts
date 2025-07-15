import { SubmissionsWithRelations } from '@/lib/course/actions';
import { querySubmissionsByIds } from '@/utils/query';
import { NextResponse } from 'next/server';
import { launch, PDFOptions } from 'puppeteer';
import * as cheerio from 'cheerio';

const defaultPDFOptions: PDFOptions = {
  format: 'A4',
  margin: {
    top: 32,
    bottom: 32,
    left: 16,
    right: 16,
  },
};

async function getPDFContentFromHtmlString(
  html: string,
): Promise<Uint8Array | null> {
  try {
    const browser = await launch({ headless: true, protocolTimeout: 500000 });
    const page = await browser.newPage();

    await page.setContent(html, {});
    const buffer = await page.pdf(defaultPDFOptions);

    await browser.close();

    return buffer;
  } catch (e) {
    console.error('导出html为pdf失败', html, e);
    return null;
  }
}

function isRelativePath(path: string) {
  return path.startsWith('/') || path.startsWith('.');
}

/**
 *
 * @param path
 * @returns
 * @example
 * replaceImgRelativePath('/api/image/viewer?path=1732605653460-yp581.png')
 * 'api/image/viewer?path=1732605653460-yp581.png'
 * replaceImgRelativePath('./api/image/viewer?path=1732605653460-yp581.png')
 * 'api/image/viewer?path=1732605653460-yp581.png'
 * replaceImgRelativePath('../api/image/viewer?path=1732605653460-yp581.png')
 * 'api/image/viewer?path=1732605653460-yp581.png'
 * replaceImgRelativePath('../../api/image/viewer?path=1732605653460-yp581.png')
 * 'api/image/viewer?path=1732605653460-yp581.png'
 */
function replaceImgRelativePath(path: string) {
  if (!isRelativePath(path)) return path;

  return path
    .split('/')
    .filter((item) => item !== '.' && item !== '..' && item !== '')
    .join('/');
}

function mergeHtmlContent(
  origin: string,
  data: Array<Omit<SubmissionsWithRelations, 'attachments'>>,
): string {
  return data
    .map((submission) => {
      // 每份作业头部追加 "班级、学生名字、作业标题 课程" 信息
      const prefix = `<h1>${submission.homework.plan.class.name} ${submission.student.name} ${submission.homework.plan.course.name} ${submission.homework.name}</h1>`;

      const $ = cheerio.load(submission.text ?? '', null, false);
      $('img').map((i, img) => {
        const src = img.attribs['src'];
        if (src && isRelativePath(src)) {
          img.attribs.src = origin + '/' + replaceImgRelativePath(src);
        }

        return img;
      });

      return prefix + $.html();
    })
    .join('</br>');
}

function getTableTopStr(
  data: Array<Omit<SubmissionsWithRelations, 'attachments'>>,
): string {
  const rowHtml = data
    .map((submission) => {
      const item = `<tr>
        <td>${submission.student.user.name}</td>
        <td>${submission.student.name}</td>
        <td>${submission.score}</td></tr>`;
      return item;
    })
    .join('');

  const tableHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table, th, td {
          border: 1px solid black;
        }
        th, td {
          padding: 8px;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <h1>学生作业成绩汇总</h1>
      <table>
        <tr>
          <th>学号</th>
          <th>姓名</th>
          <th>成绩</th>
        </tr>
        ${rowHtml}
      </table>
    </body>
    </html>`;
  return tableHtml;
}

export async function POST(req: Request, res: NextResponse) {
  const data: { id: Array<string> } = await req.json();

  if (!Array.isArray(data.id)) {
    return NextResponse.json(
      { error: 'homework id list is required' },
      { status: 400, headers: { 'X-Export-Status': '-1' } },
    );
  }

  // 查询同学作业
  const homework = await querySubmissionsByIds(data.id);

  if (homework.length) {
    const origin = new URL(req.url).origin;
    let htmlContent = mergeHtmlContent(origin, homework);
    if (homework.length > 1) {
      htmlContent = getTableTopStr(homework) + htmlContent;
    }
    /*
    console.log(
      '--------origin----homework------',
      origin,
      homework,
      htmlContent,
    );
    */
    const pdf = await getPDFContentFromHtmlString(htmlContent);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${data.id.join('-')}.pdf`,
        'X-Export-Status': '0',
      },
    });
  } else {
    return NextResponse.json(
      { error: '系统错误' },
      { status: 500, headers: { 'X-Export-Status': '-2' } },
    );
  }
}
