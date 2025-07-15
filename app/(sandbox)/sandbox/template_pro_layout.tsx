'use client';

import { Fragment, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, Transition } from '@headlessui/react';
import clsx from 'clsx';
import {
  House,
  Users,
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
  GearSix,
} from '@phosphor-icons/react';
// import {
//   ProLayout,
// } from '@ant-design/pro-components';
import { Button, Descriptions, Result, Space, Statistic } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const ProLayout = dynamic(
  () => import('@ant-design/pro-components').then((w) => w.ProLayout),
  {
    ssr: false,
  },
);

/*
const items: MenuProps['items'] = [
  getItem('管理', 'manage', <GearSix />, [
    getItem(
      '用户管理',
      'user',
      null,
      [
        getItem('权限管理', '/manage/user/permission'),
        getItem('教师管理', '/manage/user/teacher'),
        getItem('学生管理', '/manage/user/student'),
        getItem('通用账户管理', '/manage/user/common'),
      ],
      'group',
    ),
    getItem(
      '课程管理',
      'course',
      null,
      [
        getItem('排课管理', '/manage/course/list'),
        getItem('资源管理', '/manage/course/resource'),
        getItem('作业管理', '/manage/course/homework'),
        getItem('学生反馈管理', '/manage/course/feedback'),
      ],
      'group',
    ),
  ]),

  getItem('教学-学生', 'study-student', <GraduationCap />, [
    getItem('课表', '/study-student/timetable'),
    getItem('课程', '/study-student/course'),
    getItem('作业', '/study-student/homework'),
    getItem('考试', '/study-student/exam'),
    getItem('补课', '/study-student/makeup'),
  ]),

  getItem('教学-教师', 'study-teacher', <GraduationCap />, [
    getItem('课件', '/study-teacher/courseware'),
    getItem('预习', '/study-teacher/preparation'),
    getItem('课堂记录', '/study-teacher/record'),
    getItem('作业', '/study-teacher/homework'),
    getItem('考试', '/study-teacher/exam'),
  ]),

  getItem('成长日志-学生', 'profile-student', <ClockCounterClockwise />, [
    getItem('管理', '/profile-student/manage'),
  ]),

  getItem('成长日志-学校', 'profile-school', <ClockCounterClockwise />, [
    getItem('管理', '/profile-school/manage'),
  ]),

  getItem('智能设备', 'iot', <Globe />, [
    getItem('监控平台', '/iot/monitor'),
    getItem('智能门禁', '/iot/door'),
    getItem('仪器预约', '/iot/instrument'),
    getItem('大数据', '/iot/bigdata'),
    getItem('试剂耗材', '/iot/reagent'),
  ]),

  { type: 'divider' },

  getItem(
    '备份',
    'backup',
    null,
    [
      getItem('首页', '/welcome'),
      getItem('课表', '/timetable'),
      getItem('我的课程', '/course'),
      getItem('我的作业', '/homework'),
      getItem('成长日志', '/profile'),
    ],
    'group',
  ),
  getItem('调试', 'demo', null, [getItem('页面模板', '/demo/a0')], 'group'),
];
*/

const LogoTitle = () => {
  return (
    <div className="px-2 rounded-md text-md font-bold bg-indigo-500 text-white logo">
      BioAZ
    </div>
  );
};

const navigation = [
  { name: '首页', href: '/welcome', icon: House },
  { name: '课表', href: '/timetable', icon: CalendarBlank },
  { name: '我的课程', href: '/course', icon: GraduationCap },
  { name: '我的作业', href: '/homework', icon: Files },
  // { name: '智慧课堂', href: '/student', icon: Users },
  { name: '成长日志', href: '/profile', icon: ClockCounterClockwise },
  { name: '预约', href: '/reservation', icon: CalendarPlus },
  { name: '页面模板', href: '/demo', icon: Cube },
  // { name: '科研教学', href: '/study', icon: Notepad },
  // { name: '智能设备', href: '/iot', icon: Globe },
];
const tools = [
  { id: 1, name: '通知', href: '/student', initial: 'A', current: false },
  { id: 2, name: '设置', href: '/student', initial: 'B', current: false },
  { id: 3, name: 'C', href: '/student', initial: 'C', current: false },
];

const content = (
  <Descriptions size="small" column={2}>
    <Descriptions.Item label="创建人">张三</Descriptions.Item>
    <Descriptions.Item label="联系方式">
      <a>421421</a>
    </Descriptions.Item>
    <Descriptions.Item label="创建时间">2017-01-10</Descriptions.Item>
    <Descriptions.Item label="更新时间">2017-10-10</Descriptions.Item>
    <Descriptions.Item label="备注">
      中国浙江省杭州市西湖区古翠路
    </Descriptions.Item>
  </Descriptions>
);

const defaultProps = {
  route: {
    path: '/',
    routes: [
      {
        path: '/welcome',
        name: '欢迎',
        icon: <House />,
      },
      {
        path: '/manage',
        name: '管理',
        icon: <GearSix />,
        routes: [
          {
            path: '/manage/user/permission',
            name: '用户管理',
            icon: <GearSix />,
          },
          {
            path: '/admin/sub-page2',
            name: '二级页面',
            icon: <House />,
          },
          {
            path: '/admin/sub-page3',
            name: '三级页面',
            icon: <House />,
            component: './Welcome',
          },
        ],
      },
      {
        name: '列表页',
        icon: <House />,
        path: '/list',
        component: './ListTableList',
        routes: [
          {
            path: '/list/sub-page',
            name: '列表页面',
            icon: <House />,
            routes: [
              {
                path: 'sub-sub-page1',
                name: '一一级列表页面',
                icon: <House />,
                component: './Welcome',
              },
              {
                path: 'sub-sub-page2',
                name: '一二级列表页面',
                icon: <House />,
                component: './Welcome',
              },
              {
                path: 'sub-sub-page3',
                name: '一三级列表页面',
                icon: <House />,
                component: './Welcome',
              },
            ],
          },
          {
            path: '/list/sub-page2',
            name: '二级列表页面',
            icon: <House />,
            component: './Welcome',
          },
          {
            path: '/list/sub-page3',
            name: '三级列表页面',
            icon: <House />,
            component: './Welcome',
          },
        ],
      },
      {
        path: 'https://ant.design',
        name: 'Ant Design 官网外链',
        icon: <House />,
      },
    ],
  },
  location: {
    pathname: '/',
  },
};

type TemplateProps = {
  children?: React.ReactNode;
};

const Template: React.FC<TemplateProps> = ({ children }) => {
  const pathName = usePathname();
  const router = useRouter();

  useEffect(() => {
    // html 和 body 的 classname 都增加 h-full
    document.documentElement.classList.add('h-full');
    document.body.classList.add('h-full');
  }, []);
  useEffect(() => {}, [pathName]);
  return (
    <>
      <div
        id="pro-layout"
        // logo={null}
        // logo={(<LogoTitle />)}
        style={{
          height: '100vh',
        }}
      >
        <ProLayout
          {...defaultProps}
          location={{
            pathname: pathName,
          }}
          // logo={<LogoTitle />}
          // logo={null}
          logo={
            <div className="w-8 h-8 bg-indigo-500 rounded-lg text-white text-xl flex items-center justify-center">
              B
            </div>
          }
          // title={<LogoTitle />}
          title="bioAZ"
          menuFooterRender={(props) => null}
          onMenuHeaderClick={(e) => console.log(e)}
          menuItemRender={(item, dom) => (
            <Link href={item.path || '/welcome'}>{dom}</Link>
          )}
          avatarProps={
            {
              // icon: <UserOutlined />,
            }
          }
          // {...settings}
        >
          {children}
        </ProLayout>
      </div>
    </>
  );
};

export default Template;
