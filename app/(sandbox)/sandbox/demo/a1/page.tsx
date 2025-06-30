'use client';
import { Card, Col, Row, Tag, Statistic, Progress, Tabs } from 'antd';
import { ArrowUp } from '@phosphor-icons/react';
import type { TabsProps } from 'antd';

const { Meta } = Card;

const list = [
  {
    name: '原子分子离子和化学键 | Atoms, Molecules, Ions & Chemical Bonds',
    parent: 13,
  },
  {
    name: '234',
    parent: 87,
  },
  {
    name: '123',
    parent: 73,
  },
  {
    name: '532',
    parent: 0,
  },
  {
    name: '123',
    parent: 100,
  },
  {
    name: '123',
    parent: 73,
  },
];
const items: TabsProps['items'] = [
  {
    key: '1',
    label: '全部',
  },
  {
    key: '2',
    label: '必修课',
  },
  {
    key: '3',
    label: '选修课',
  },
  {
    key: '4',
    label: '已学完',
  },
  {
    key: '5',
    label: '未学完',
  },
];

const A1 = () => {
  return (
    <div>
      <Row gutter={16} className="mb-8">
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="课程进度"
              value={11.28}
              precision={2}
              // valueStyle={{ color: '#3f8600' }}
              // prefix={<ArrowUpOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="学习时长"
              value={69.3}
              precision={2}
              // valueStyle={{ color: '#cf1322' }}
              // prefix={<ArrowDownOutlined />}
              suffix="小时"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic
              title="班级排名"
              value={12}
              // precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ArrowUp size={22} />}
              suffix=""
            />
          </Card>
        </Col>
      </Row>
      <Tabs
        defaultActiveKey="1"
        type="card"
        items={items}
        onChange={() => null}
      />
      <Row gutter={[16, 16]}>
        {list.map((item, index) => (
          <Col key={index} span={6}>
            <Card
              size="small"
              hoverable
              // style={{ width: 240 }}
              cover={<img alt="example" src="/image/02.jpeg" />}
            >
              <Meta
                description={
                  <div>
                    <div className="mb-2">
                      <Tag color="red">必修课</Tag>
                    </div>
                    <p className="h-12 overflow-hidden text-gray-900 line-clamp-2">
                      {item.name}
                    </p>
                    <Progress
                      size="small"
                      percent={item.parent}
                      format={(percent) => {
                        if (percent === 100) {
                          return '学完';
                        } else if (percent === 0) {
                          return '未学';
                        }
                        return `${percent}%`;
                      }}
                      status="active"
                    />
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default A1;
