'use client';

import { Editor } from '@tinymce/tinymce-react';
import { Editor as TinyMCEEditor } from 'tinymce';
import { useState, useEffect } from 'react';
import { message, Spin } from 'antd';
import { resizeImage } from '@/utils/utils';

// import { note } from '@/utils/api';

export type ProgressFnType = (percent: number) => void;

export type EditorBlobInfoType = {
  id: () => string;
  name: () => string;
  filename: () => string;
  blob: () => Blob;
  base64: () => string;
  blobUri: () => string;
  uri: () => string | undefined;
};

const initFullProps = (info: { name?: string }) => {
  return {
    inline: false,
    menubar: '',
    // menubar: 'file edit insert view format table tools help',
    placeholder: '写点什么吧……',
    formats: {
      tindent_format: { selector: 'p', styles: { 'text-indent': '40mm' } },
    },
    toolbar:
      'undo redo | h1 h2 h3 | bold italic backcolor |  \
    superscript subscript | image | numlist bullist table | exportword',
    plugins: [
      'table',
      'lists',
      'image',
      'paste_from_word',
      // 'exportword',
      // 'mybutton'
      // plugins: 'link image table',
    ],
    paste_webkit_styles: 'all',
    paste_remove_styles_if_webkit: false,
    fontsize_formats: '8pt 10pt 12pt 14pt 18pt 24pt',
    contextmenu: 'copy  wordcount',
    browser_spellcheck: true,
    language: 'zh-Hans',
    // force_p_newlines: false,
    paste_data_images: true,
    automatic_uploads: true,
    branding: false,
    // forced_root_block: false,
    height: 'calc(100vh - 40px)',
    promotion: false,
  };
};

const handleUpload = async (
  blobInfo: EditorBlobInfoType,
  progress: ProgressFnType,
) => {
  const formData = new FormData();
  formData.append('file', blobInfo.blob());
  // /api/upload formData upload image

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  console.log('data: ', data);
  if (data.status === 'success') {
    const url = `/api/image/viewer?path=${data.data?.fileKey}`;
    return url;
  }
  message.error('上传失败');
  return '';
};

type Props = {
  id: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  height?: string;
  inline?: boolean;
  contentStyle?: string;
  onChange?: (value: string, plainText: string) => void;
};

const CustomEditor: React.FC<Props> = ({
  id,
  name,
  value = '',
  disabled = false,
  inline = false,
  height = 'calc(100vh - 57px)',
  contentStyle = 'img { max-width: 100%; }',
  onChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState<string>(value);
  const handleChange = (value: string, editor: TinyMCEEditor) => {
    setText(value);
    const plainText = editor.getContent({ format: 'text' });
    console.log('plainText: ', plainText);
    onChange?.(value, plainText);
  };
  useEffect(() => {
    setText(value);
  }, [value]);
  return (
    <>
      {loading && <Spin />}
      <Editor
        id={id}
        onInit={() => {
          setLoading(false);
        }}
        // tinymceScriptSrc={`https://cdn.tiny.cloud/1/${process.env.NEXT_PUBLIC_TINY_MCE_API_KEY}/tinymce/6/tinymce.min.js`}
        tinymceScriptSrc={'/tinymce/tinymce.min.js'}
        // value={contenido}
        value={text}
        // apiKey={process.env.NEXT_PUBLIC_TINY_MCE_API_KEY}
        init={{
          ...initFullProps({ name }),
          disabled,
          height,
          inline,
          content_style: contentStyle,
          images_upload_handler: (blobInfo, progress) =>
            handleUpload(blobInfo, progress),
          /*
          images_upload_handler: async (blobInfo) => {
            const base64str =
              'data:' + blobInfo.blob().type + ';base64,' + blobInfo.base64();
            const resized = await resizeImage(base64str, 500, 500);
            console.log('resized: ', resized);
            return Promise.resolve(resized);
          },
          */
          /*
          paste_preprocess: function (plugin, args) {
            console.log('Attempted to paste: ', args.content);
            alert('禁止粘贴');
            // replace copied text with empty string
            args.content = '';
          },
          */
        }}
        onEditorChange={handleChange}
      />
    </>
  );
};

export default CustomEditor;
