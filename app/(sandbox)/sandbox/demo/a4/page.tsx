'use client';

import { Space, Table, Tag, Button, Form, Input, Radio } from 'antd';
import type { TableProps } from 'antd';
import { Plus } from '@phosphor-icons/react';

const dataSource = [
  {
    key: '1',
    name: '张三',
    date: '2021-09-01',
    log: '添加课程',
    ip: '北京市',
  },
];

const columns = [
  {
    title: '人员',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '操作',
    dataIndex: 'log',
    key: 'log',
  },
  {
    title: 'IP 地区',
    dataIndex: 'ip',
    key: 'ip',
  },
  {
    title: '时间',
    dataIndex: 'date',
    key: 'date',
  },
  {
    title: '操作',
    key: 'action',
    render: (_: any, record: any) => (
      <Space size="middle">
        <a>详情</a>
      </Space>
    ),
  },
];
const A4 = () => {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Form
          layout="inline"

          // initialValues={{ layout: formLayout }}
          // onValuesChange={onFormLayoutChange}
          // style={{ maxWidth: formLayout === 'inline' ? 'none' : 600 }}
        >
          <Form.Item label="人员">
            <Input placeholder="人员" />
          </Form.Item>
          <Form.Item label="时间">
            <Input placeholder="时间" />
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

export default A4;
