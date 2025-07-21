'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import type { ModalFormProps } from '@ant-design/pro-components';
import {Col, Row, Space, message, Popconfirm, Button, List, Tabs, Modal, Form, Input, Select, Table, Tag, Divider, Upload, Card, Popover, Spin, Typography, Pagination, Descriptions} from 'antd';
import type { TabsProps, DescriptionsProps, TableProps, UploadProps, UploadFile} from 'antd';
import { BookOutlined, FileTextOutlined, TeamOutlined, EditOutlined, CheckSquareOutlined, SettingOutlined } from '@ant-design/icons';
import Link from 'next/link';

import Classlist from './my_class';
import HomeWork from './my_homework';
import StudentPasswordSettings from './set';

const Admin_Student = () => {
    const items: TabsProps['items'] = [
        {
            key: 'my_class',
            label: (
                <span>
                    <BookOutlined />
                    我的课程
                </span>
            ),
            children: <Classlist />,
        },
        {
            key: 'my_homework',
            label: (
                <span>
                    <EditOutlined />
                    我的作业
                </span>
            ),
            children: <HomeWork />,
        },
        {
            key: 'set_password',
            label:(
                <span>
                    <SettingOutlined />
                    系统设置
                </span>
            ),
            children: <StudentPasswordSettings />,
        }
    ];
    return (
        <div style={{
            height: '100vh',
            width: '100%',
            backgroundColor: 'white',
            position: 'relative',  // 添加这行
            left: '80px',
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
                position: 'fixed',
                right: '1337px',
                top: '96px',
                height: '100vh',
                zIndex: 1000,
                }} 
                />
        </div>
    )
}

export default Admin_Student;