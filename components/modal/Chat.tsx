'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Segmented, message, Input, Spin, Typography } from 'antd';
import markdownit from 'markdown-it';
import mk from '@traptitech/markdown-it-katex';
import { Bubble, Sender, useXAgent, useXChat, Suggestion } from '@ant-design/x';
import 'katex/dist/katex.min.css'; // 必须导入 KaTeX 的 CSS

import type { GetProp, GetRef } from 'antd';
import type { BubbleProps } from '@ant-design/x';
import { UserOutlined } from '@ant-design/icons';
import { analyzePdfContent } from '@/lib/ai/actions';

const md = markdownit({ html: true, breaks: true });
md.use(mk);

const renderMarkdown: BubbleProps['messageRender'] = (content) => (
  <Typography>
    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
    <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
  </Typography>
);

const roles: GetProp<typeof Bubble.List, 'roles'> = {
  ai: {
    placement: 'start',
    // avatar: { icon: <Brain />, style: { background: '#324fbe' } },
    typing: { step: 5, interval: 20 },
    style: {
      maxWidth: 600,
    },
    messageRender: renderMarkdown,
    loading: true,
  },
  user: {
    placement: 'end',
    avatar: { icon: <UserOutlined />, style: { background: '#aaa' } },
  },
};

type GlobalChatProps = {
  visible: boolean;
  fileKey: string;
  onClose?: () => void;
};

const GlobalChat: React.FC<GlobalChatProps> = ({
  visible,
  fileKey,
  onClose,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');
  const [agent] = useXAgent({
    request: async ({ message }, { onSuccess, onError }) => {
      // await sleep();
      console.log('fileKey', fileKey);
      console.log('message', message);
      if (!fileKey) {
        onError(new Error('fileKey is required'));
        return;
      }
      if (!message) {
        onError(new Error('message is required'));
        return;
      }
      const res = await analyzePdfContent([fileKey], message);
      console.log(res);

      if (res.code === 0) {
        onSuccess(res.data?.answer ?? '');
        return;
      }

      onError(new Error('Mock request failed'));
    },
  });

  const { onRequest, messages } = useXChat({
    agent,
    requestPlaceholder: 'Waiting...',
    requestFallback: '服务器错误，请稍后再试',
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      const behavior = navigator.userAgent.includes('Chrome')
        ? 'auto'
        : 'smooth';
      bottomRef.current?.scrollIntoView({ behavior });
    }, 0);
  };

  useEffect(() => {}, [visible]);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  return (
    <Modal
      width={800}
      destroyOnClose
      open={visible}
      onCancel={onClose}
      footer={null}
      title="AI助手"
      maskClosable={false}
    >
      <div className="h-[500px] flex flex-col gap-y-2">
        <div id="messages" className="flex-1 overflow-y-auto p-2 space-y-2">
          <Bubble.List
            // items={messages}
            autoScroll
            items={messages.map(({ id, message, status }) => ({
              key: id,
              loading: status === 'loading',
              role: status === 'local' ? 'user' : 'ai',
              content: message,
            }))}
            roles={roles}
          />
          <div ref={bottomRef} />
        </div>

        <Sender
          loading={agent.isRequesting()}
          value={prompt}
          submitType="shiftEnter"
          onChange={(nextVal) => {
            setPrompt(nextVal);
          }}
          onSubmit={(nextContent) => {
            onRequest(nextContent);
            setPrompt('');
          }}
          placeholder="给 AI 发送消息"
        />
      </div>
    </Modal>
  );
};

export default GlobalChat;
