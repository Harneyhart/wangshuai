'use client';

import React, { useState } from 'react';
import { Space, Table, Tag, Button, Form, Input, Radio } from 'antd';
import type { TableProps } from 'antd';
import { Plus } from '@phosphor-icons/react';

import { fakeTeachers } from '@/utils/mock';
import EditTeacher from '@/components/modal/EditTeacher';

const dataSource = [
  {
    key: '1',
    name: '张三',
    email: 'zhangxs@as.com',
    date: '2021-09-01',
  },
  {
    key: '2',
    name: '李四',
    email: 'lisi@sz.com',
    date: '2021-09-01',
  },
  {
    key: '3',
    name: '王五',
    email: 'wangz@sae.com',
    date: '2021-09-01',
  },
];

const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: '部门',
    dataIndex: 'department',
    key: 'department',
  },
  {
    title: '职称',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: '授权资格',
    dataIndex: 'qualification',
    key: 'qualification',
  },
  {
    title: '加入时间',
    dataIndex: 'date',
    key: 'date',
  },
  {
    title: '操作',
    key: 'action',
    render: (_: any, record: any) => (
      <Space size="middle">
        <a>学习</a>
        <a>编辑</a>
      </Space>
    ),
  },
];
const Teacher = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="flex gap-x-2">
          <Button
            type="primary"
            onClick={() => setShowEditModal(true)}
            icon={<Plus size={14} weight="bold" />}
          >
            添加
          </Button>
          <Button className="">批量导入教师</Button>
        </div>
        <Form
          layout="inline"

          // initialValues={{ layout: formLayout }}
          // onValuesChange={onFormLayoutChange}
          // style={{ maxWidth: formLayout === 'inline' ? 'none' : 600 }}
        >
          <Form.Item label="姓名">
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item label="邮箱">
            <Input placeholder="邮箱" />
          </Form.Item>
          <Form.Item>
            <Button type="primary">搜索</Button>
          </Form.Item>
        </Form>
      </div>
      <Table dataSource={fakeTeachers} columns={columns} />
      <EditTeacher
        open={showEditModal}
        handleCancel={() => setShowEditModal(false)}
        handleOk={() => setShowEditModal(false)}
      />
    </div>
  );
};

export default Teacher;
