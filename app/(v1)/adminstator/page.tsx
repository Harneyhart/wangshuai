'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import type { ModalFormProps } from '@ant-design/pro-components';
import {
  Col,
  Row,
  Space,
  message,
  Popconfirm,
  Button,
  List,
  Tabs,
  Card,
  Tag,
  Table,
  Descriptions,
  Popover,
  Upload,
} from 'antd';
import type {
  TabsProps,
  DescriptionsProps,
  TableProps,
  UploadProps,
  UploadFile,
} from 'antd';
import Link from 'next/link';

import UserList from './user';
import StudentList from './student';
import TeacherList from './teacher';

const Admin = ({
  searchParams,
}: {
  searchParams?: {
    tab?: string;
  };
}) => {
  const pathName = usePathname();
  const router = useRouter();

  const items: TabsProps['items'] = [
    {
      key: 'user',
      label: '用户管理',
      children: <UserList />,
    },
    {
      key: 'student',
      label: '学生管理',
      children: <StudentList />,
    },
    {
      key: 'teacher',
      label: '老师管理',
      children: <TeacherList />,
    },

  ];
  return (
    <div>
      <Tabs
        defaultActiveKey={searchParams?.tab}
        tabPosition="left"
        items={items}
        onChange={(key) => {
          router.push(`/adminstator?tab=${key}`);
        }}
      />
    </div>
  );
};

export default Admin;
