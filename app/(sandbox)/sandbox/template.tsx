'use client';

import { Fragment, useState, useEffect } from 'react';
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
  Keyhole,
  UserCircleGear,
  Bug,
  Student,
} from '@phosphor-icons/react';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import { usePathname, useRouter } from 'next/navigation';

const { Header, Content, Sider, Footer } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group',
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

const items: MenuProps['items'] = [
  getItem('管理', 'manage', <GearSix />, [
    getItem(
      '用户管理',
      'user',
      null,
      [
        getItem('权限管理', '/manage/user/permission', <Keyhole />),
        getItem('教师管理', '/manage/user/teacher', <GraduationCap />),
        getItem('学生管理', '/manage/user/student', <Student />),
        getItem('通用账户管理', '/manage/user/common', <UserCircleGear />),
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
    getItem('课表', '/study-student/timetable', <CalendarBlank />),
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
    /*
    getItem('Submenu', 'sub3', null, [
      getItem('Option 7', '7'),
      getItem('Option 8', '8'),
    ]),
    */
  ]),

  { type: 'divider' },

  getItem(
    '调试',
    'demo',
    null,
    [getItem('页面模板', '/sandbox/demo/a0', <Bug />)],
    'group',
  ),
];

const LogoTitle = () => {
  return (
    <div className="px-2 rounded-md text-xl font-bold bg-indigo-500 text-white logo">
      BioAZ
    </div>
  );
};

type TemplateProps = {
  children?: React.ReactNode;
};

const SIDE_MENU_WIDTH = 250;

const getMenuName = (menu: MenuItem[], key: string): string => {
  if (!menu) {
    return '';
  }
  let label = '';
  // 通过 key 获取 items 中对应的 label
  menu.forEach((item) => {
    if (item?.key === key) {
      // @ts-ignore
      label = item.label as string;
    }
    // @ts-ignore
    if (item?.children) {
      // @ts-ignore
      const name = getMenuName(item.children, key);
      if (name) {
        label = name;
      }
    }
  });
  return label;
};

const Template: React.FC<TemplateProps> = ({ children }) => {
  const pathName = usePathname();
  const router = useRouter();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const [selectedKeys, setSelectedKeys] = useState<MenuProps['selectedKeys']>(
    [],
  );
  const [openKeys, setOpenKeys] = useState<MenuProps['openKeys']>([]);
  const [collapsed, setCollapsed] = useState(false);

  const onClickMenu: MenuProps['onClick'] = ({ key }) => {
    console.log('key:', key);
    router.push(key);
  };

  useEffect(() => {
    // html 和 body 的 classname 都增加 h-full
    document.documentElement.classList.add('h-full');
    document.body.classList.add('h-full');
  }, []);
  useEffect(() => {
    console.log('selectedKeys:', selectedKeys);
    console.log('pathName:', pathName);
    setSelectedKeys([pathName]);
    // 通过 pathName 获取 items 中对应父级的 key
  }, [pathName]);
  return (
    <Layout hasSider style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={SIDE_MENU_WIDTH}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="flex p-2">{!collapsed && <LogoTitle />}</div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={items}
          onClick={onClickMenu}
        />
        <div className="h-32"></div>
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : SIDE_MENU_WIDTH }}>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <p className="text-lg font-bold pt-4 pl-4">
            {getMenuName(items, pathName)}
          </p>
        </Header>
        <Content style={{ margin: '16px 16px' }}>
          {/*
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>User</Breadcrumb.Item>
            <Breadcrumb.Item>Bill</Breadcrumb.Item>
          </Breadcrumb>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            Bill is a cat.
          </div>
          */}
          {children}
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          BioAZ ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default Template;
