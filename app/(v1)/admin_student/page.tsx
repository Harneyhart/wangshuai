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
        }
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
            size="large" 
            type="card"
            tabBarStyle={{
                minWidth: '200px',
                backgroundColor: 'white',
                borderRight: '1px solid #f0f0f0'
                }}
                />
        </div>
    )
}

export default Admin_Student;