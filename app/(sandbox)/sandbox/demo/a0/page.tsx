'use client';

import {
  Space,
  Table,
  Tag,
  Button,
  Form,
  Statistic,
  Card,
  Col,
  Row,
  Badge,
} from 'antd';
import dynamic from 'next/dynamic';
import type { TableProps } from 'antd';
// import { Pie } from '@ant-design/plots';
import { Plus, User, UploadSimple, PencilSimple } from '@phosphor-icons/react';
import Item from 'antd/es/list/Item';

const Pie = dynamic(() => import('@ant-design/plots').then((w) => w.Pie), {
  ssr: false,
});

const config = {
  data: [
    { type: '分类一', value: 27 },
    { type: '分类二', value: 25 },
    { type: '分类三', value: 18 },
    { type: '分类四', value: 15 },
    { type: '分类五', value: 10 },
    { type: '其他', value: 5 },
  ],
  angleField: 'value',
  colorField: 'type',
  paddingRight: 80,
  innerRadius: 0.6,
  label: {
    text: 'value',
    style: {
      fontWeight: 'bold',
    },
  },
  legend: {
    color: {
      title: false,
      position: 'right',
      rowPadding: 5,
    },
  },
  annotations: [
    {
      type: 'text',
      style: {
        text: '系统\n资源',
        x: '50%',
        y: '50%',
        textAlign: 'center',
        fontSize: 24,
        fontStyle: 'bold',
      },
    },
  ],
};

const top10 = [
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
  {
    name: 'abc',
  },
];

const tools = [
  {
    name: '添加学生',
    icon: User,
    color: '#22d3ee',
  },
  {
    name: '上传视频',
    icon: UploadSimple,
    color: '#f472b6',
  },
  {
    name: '编辑',
    icon: User,
    color: '#4ade80',
  },
  {
    name: '编辑',
    icon: PencilSimple,
    color: '#fbbf24',
  },
];

const A3 = () => {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="总学生数" value={1143} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总课程数" value={93} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总课程数" value={93} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总课程数" value={93} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="快捷操作">
            <ul className="flex justify-between">
              {tools.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-center gap-x-2 rounded-md p-2 cursor-pointer hover:bg-gray-50"
                >
                  <div
                    className="p-2 rounded-md"
                    style={{
                      backgroundColor: item.color,
                    }}
                  >
                    <item.icon className="text-white" weight="bold" />
                  </div>
                  <p>{item.name}</p>
                </li>
              ))}
            </ul>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="产品文档">整理中……</Card>
        </Col>
        <Col span={12}>
          <Card title="今日学习排行">
            <div className="h-48">
              <ul className="columns-2">
                {top10.map((item, index) => (
                  <li className="mb-2 flex gap-2" key={index}>
                    <Badge color="#faad14" count={index + 1} />
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="资源统计">
            <div className="h-48">
              <Pie {...config} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default A3;
