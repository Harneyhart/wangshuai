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
import ClassList from './class';
import StudentList from './student';
import TeacherList from './teacher';
import Course from './course';
import CourseHour from './course-hour';
import Homework from './homework';

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
    {
      key: 'class',
      label: '班级管理',
      children: <ClassList />,
    },
    {
      key: 'course',
      label: '课程管理',
      children: <Course />,
    },
    {
      key: 'courseHour',
      label: '排课管理',
      children: <CourseHour />,
    },
    {
      key: 'homework',
      label: '作业管理',
      children: <Homework />,
    },
  ];
  return (
    <div>
      <Tabs
        defaultActiveKey={searchParams?.tab}
        tabPosition="left"
        items={items}
        onChange={(key) => {
          router.push(`/admin?tab=${key}`);
        }}
      />
    </div>
  );
};

export default Admin;
