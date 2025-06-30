import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App } from 'antd';

import themeConfig from '@/theme/themeConfig';
import './globals.css';

export const metadata: Metadata = {
  title: 'BioAZ',
  description: '',
};

const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang="zh-CN">
    <body>
      <AntdRegistry>
        <ConfigProvider theme={themeConfig}>
          <App>{children}</App>
        </ConfigProvider>
      </AntdRegistry>
    </body>
  </html>
);

export default RootLayout;
