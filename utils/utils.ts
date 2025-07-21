import type { UploadFile } from 'antd';
import type { ModalFormProps } from '@ant-design/pro-components';

import * as schema from '@/lib/db/schema';
import { UpsertUploadFileItem } from '@/lib/course/actions';

export const parseAttachmentToUploadFile = (
  data: schema.AttachmentSelect | null,
): UploadFile[] => {
  if (!data) {
    return [];
  }
  return [
    {
      uid: data.id,
      name: data.name,
      status: 'done',
      fileName: data.name,
      url: `${window.location.origin}/api/attachment/view?key=${data.fileKey}`,
      // thumbUrl: `/upload/${data.fileKey}`,
    },
  ];
};

export const renderCoverUrl = (data: schema.AttachmentSelect | null) => {
  if (data?.fileKey) {
    return `/api/attachment/view?key=${data.fileKey}`;
  }
  return '/image/02.jpeg';
};

export const parseUploadFileToUpsertUploadFile = (
  files: Array<
    UploadFile | { name: string; fileName: string; fileKey: string }
  > = [],
): UpsertUploadFileItem => {
  return files.map((file) => {
    // 修改表单，没有重新走图片上传逻辑 数据是已经处理完的 直接返回
    if ('fileKey' in file && 'fileName' in file && 'name' in file) {
      return file;
    }

    if (file.response) {
      // 新上传文件
      return {
        name: file.response.data.fileName,
        fileKey: file.response.data.fileKey,
        ...file.response.data,
      };
    }
    return {
      name: file.name,
      fileKey: file.url?.split('/').pop() || '',
      fileName: file.name,
    };
  });
};

export const formConfig = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 },
  layout: 'horizontal' as ModalFormProps['layout'],
  modalProps: {
    destroyOnClose: true,
    width: 600,
  },
};

export const renderFileViewLink = (fileKey: string): string => {
  return `/api/attachment/view?key=${fileKey}`;
};

export const resizeImage = (
  base64Str: string,
  maxWidth: number = 2000,
  maxHeight: number = 2000,
) => {
  return new Promise<string>((resolve, reject) => {
    let img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let canvas = document.createElement('canvas');
      const MAX_WIDTH = maxWidth;
      const MAX_HEIGHT = maxHeight;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      let ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('failed to get context');
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL());
    };
  });
};
