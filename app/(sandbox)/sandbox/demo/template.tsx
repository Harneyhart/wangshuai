'use client';

import { Fragment, useState } from 'react';
import clsx from 'clsx';
import { useRouter, usePathname } from 'next/navigation';
import { Col, Row, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  House,
  Users,
  Airplay,
  Certificate,
  Globe,
  Notepad,
  List,
  X,
  CalendarBlank,
  Files,
  CalendarPlus,
  ClockCounterClockwise,
  GraduationCap,
  Cube,
  Table,
} from '@phosphor-icons/react';

const items: MenuProps['items'] = [
  {
    label: '概览',
    key: 'a0',
    icon: <Globe />,
  },
  {
    label: '课程列表',
    key: 'a1',
    icon: <Airplay />,
  },
  {
    label: '课程详情',
    key: 'a2',
    icon: <Certificate />,
  },
  {
    label: '学生管理',
    key: 'a3',
    icon: <Users />,
  },
  {
    label: '管理日志',
    key: 'a4',
    icon: <Notepad />,
  },
  {
    label: 'ProTable',
    key: 'a5',
    icon: <Table />,
  },
  {
    label: '禁止点击样式',
    key: 'disabled',
    icon: <List />,
    disabled: true,
  },
];

type TemplateProps = {
  children?: React.ReactNode;
};

const Template: React.FC<TemplateProps> = ({ children }) => {
  const router = useRouter();
  const pathName = usePathname();

  const [current, setCurrent] = useState(pathName.split('/').pop() || 'a1');

  const onClick: MenuProps['onClick'] = (e) => {
    console.log('click ', e);
    setCurrent(e.key);
    router.push(`/sandbox/demo/${e.key}`);
  };
  return (
    <div className="">
      <h2 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
        页面模板
      </h2>
      <div className="mb-4">
        <Menu
          onClick={onClick}
          selectedKeys={[current]}
          mode="horizontal"
          items={items}
        />
      </div>
      <div>{children}</div>
    </div>
  );
};

export default Template;
