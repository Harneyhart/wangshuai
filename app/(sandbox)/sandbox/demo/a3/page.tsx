'use client';

import { Space, Table, Tag, Button, Form, Input, Radio } from 'antd';
import type { TableProps } from 'antd';
import { Plus } from '@phosphor-icons/react';

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
    title: '学生',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
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
const A3 = () => {
  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="flex gap-x-2">
          <Button type="primary" icon={<Plus size={14} weight="bold" />}>
            添加
          </Button>
          <Button className="">批量导入学生</Button>
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
      <Table dataSource={dataSource} columns={columns} />
    </div>
  );
};

export default A3;
