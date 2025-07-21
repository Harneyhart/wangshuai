'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import type { ModalFormProps } from '@ant-design/pro-components';
import {Col, Row, Space, message, Popconfirm, Button, List, Tabs, Modal, Form, Input, Select, Table, Tag, Divider, Upload, Card, Popover, Spin, Typography, Pagination, Descriptions} from 'antd';
import type { TabsProps, DescriptionsProps, TableProps, UploadProps, UploadFile} from 'antd';
import { BookOutlined, FileTextOutlined, TeamOutlined, EditOutlined, CheckSquareOutlined, SettingOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ClassList from './class';
import Teach from './teach';
import Group from './group';
import Homework from './homework';
import THomework from './turn_homework';
import System from './sys'; 
import TeacherPasswordSettings from './set';
import MyClass from './my_class';

const Admin_Teacher = () => {
    const items: TabsProps['items'] = [
        {
            key: 'my_class',
            label: (
                <span>
                    <BookOutlined />
                    我的课程
                </span>
            ),
            children: <MyClass />,
        },
        {
            key: 'teach',
            label: (
                <span>
                    <FileTextOutlined />
                    教学课件
                </span>
            ),
            children: <Teach />,
        },
        {
            key: 'group',
            label: (
                <span>
                    <TeamOutlined />
                    班级管理
                </span>
            ),
            children: <Group />,
        },
        {
            key: 'homework',
            label: (
                <span>
                    <EditOutlined />
                    作业管理
                </span>
            ),
            children: <Homework />,
        },
        {
            key: 'turn_homework',
            label: (
                <span>
                    <CheckSquareOutlined />
                    作业批改
                </span>
            ),
            children: <THomework />,
        },
        {
            key: 'class',
            label: (
                <span>
                    <BookOutlined />
                    课程管理
                </span>
            ),
            children: <ClassList />,
        },
        {
            key: 'set_password',
            label: (
                <span>
                    <SettingOutlined />
                    系统设置
                </span>
            ),
            children: <TeacherPasswordSettings />,
        }
    //     {
    //         key: 'sys',
    //         label: (
    //             <span>
    //                 <SettingOutlined />
    //                 系统管理
    //             </span>
    //         ),
    //         children: <System />,
    //     },
    ];
    return (
        <div style={{
            height: '100vh',
            width: '100%',
            backgroundColor: 'white',
            position: 'relative',
            right: '50px',
        }}>
            <Tabs 
            items={items} 
            tabPosition="left" 
            tabBarStyle={{
                minWidth: '200px',
                backgroundColor: 'white',
                borderRight: '1px solid white',
                borderRadius: '10px',
                boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
                right: '110px',
                top: '0 px',
                }} />
        </div>
    )
}
export default Admin_Teacher;