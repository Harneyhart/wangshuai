'use client';

import dynamic from 'next/dynamic';
import { Space, Button, Form, Input } from 'antd';
import { Plus } from '@phosphor-icons/react';

// import TableCalendar from '@/components/TimeTable';

const TableCalendar = dynamic(() => import('@/components/TimeTable'), {
  ssr: false,
});
const FullCalendar = dynamic(() => import('@/components/FullCalendar'), {
  ssr: false,
});

const events = {
  周一: [
    {
      id: 1,
      name: '遗传分子的基础',
      type: 'custom',
      startTime: new Date('2024-04-01T09:30:00'),
      endTime: new Date('2024-04-01T11:30:00'),
    },
  ],
  周二: [
    {
      id: 2,
      name: '遗传分子的基础',
      type: 'custom',
      startTime: new Date('2024-04-01T10:30:00'),
      endTime: new Date('2024-04-01T11:30:00'),
    },
  ],
  周三: [],
  周四: [],
  周五: [],
};

const events2 = [
  {
    title: '遗传分子的基础',
    start: '2024-05-07T14:00',
    end: '2024-05-07T16:00',
  },
  {
    title: '遗传分子的基础',
    start: '2024-05-08T10:00',
    end: '2024-05-08T12:00',
  },
];

const TimetablePage = () => {
  return (
    <div className="App">
      <div className="mb-4 flex justify-between">
        <div className="flex gap-x-2">
          <Button type="primary" icon={<Plus size={14} weight="bold" />}>
            排课
          </Button>
          <Button className="">导出</Button>
        </div>
        <Form layout="inline">
          <Form.Item label="教师">
            <Input placeholder="教师" />
          </Form.Item>
          <Form.Item label="课程">
            <Input placeholder="课程" />
          </Form.Item>
          <Form.Item>
            <Button type="primary">搜索</Button>
          </Form.Item>
        </Form>
      </div>
      <FullCalendar events={events2} />
      {/*
      <TableCalendar events={events} />
      */}
    </div>
  );
};

export default TimetablePage;
