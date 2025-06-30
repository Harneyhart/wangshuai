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

const Admin_Teacher = () => {
    const items: TabsProps['items'] = [
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
            key: 'sys',
            label: (
                <span>
                    <SettingOutlined />
                    系统管理
                </span>
            ),
            children: <System />,
        },
    ];
    return (
        <div style={{
            height: '100vh',
            width: '100%',
            backgroundColor: 'white',
        }}>
            <Tabs 
            items={items} 
            tabPosition="left" 
            style={{ height: '100%', width: '100%' }} />
        </div>
    )
}
export default Admin_Teacher;