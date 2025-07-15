"use client"
import React, { useEffect, useState } from 'react';
import { Typography, Card, Spin, App, Button, Table, Tag, Descriptions, Space } from 'antd';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAllClasses, getAllStudents, getAllTeachers, getAllCourseHours } from '@/lib/course/actions';
import { ArrowLeftOutlined, UserOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ClassDetail {
  id: string;
  name: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  students: any[];
  teacherNames: string[];
  courseHours: any[];
}

const ClassDetailPage = () => {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get('id');
  const className = searchParams.get('name');

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassDetail = async () => {
      try {
        setLoading(true);
        // 获取班级信息
        const classes = await getAllClasses();
        const currentClass = classes.find((c: any) => c.id === classId);
        if (!currentClass) {
          message.error('未找到班级信息');
          return;
        }
        // 获取学生信息
        const students = await getAllStudents();
        // 过滤属于当前班级的学生
        const classStudents = students.filter((s: any) =>
          s.classes?.some((c: any) => c.classId === classId)
        );
        // 获取教师和课时信息
        const teachers = await getAllTeachers();
        const courseHours = await getAllCourseHours();
        // 找到该班级的课时
        const relatedCourseHours = courseHours.filter(
          (ch: any) => ch.plan?.class?.id === classId
        );
        // 获取教师名字
        const teacherIds = relatedCourseHours
          .flatMap((ch: any) => ch.teachers?.map((t: any) => t.teacherId) || []);
        const uniqueTeacherIds = Array.from(new Set(teacherIds));
        const teacherNames = uniqueTeacherIds
          .map(tid => teachers.find((t: any) => t.id === tid)?.name)
          .filter((name): name is string => !!name);
        setClassDetail({
          ...currentClass,
          isActive: currentClass.isActive ?? 0,
          createdAt: currentClass.createdAt ? new Date(currentClass.createdAt).toISOString() : '',
          updatedAt: currentClass.updatedAt ? new Date(currentClass.updatedAt).toISOString() : '',
          students: classStudents,
          teacherNames,
          courseHours: relatedCourseHours,
        });
      } catch (error) {
        console.error('获取班级详情失败:', error);
        message.error('获取班级详情失败');
      } finally {
        setLoading(false);
      }
    };
    if (classId) {
      fetchClassDetail();
    }
  }, [classId, message]);

  // 构造学生表格数据
  const studentTableData = (classDetail?.students || []).map((s: any) => ({
    id: s.id,
    studentName: s.name,
    account: s.user?.name || '',
    email: s.user?.email || '',
  }));

  const studentColumns = [
    { title: '序号', dataIndex: 'index', width: 80, render: (_: any, _record: any, idx: number) => idx + 1 },
    { title: '学生姓名', dataIndex: 'studentName' },
    { title: '账号', dataIndex: 'account' },
    { title: '学生邮箱', dataIndex: 'email' },
  ];

  const courseColumns = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 80,
      render: (_: any, _record: any, idx: number) => idx + 1,
    },
    {
      title: '课程名称',
      dataIndex: 'courseName',
      key: 'courseName',
    },
    {
      title: '教师',
      dataIndex: 'teacherNames',
      key: 'teacherNames',
      render: (teacherNames: string[]) => teacherNames?.join('、') || '未分配',
    },
    {
      title: '课时类型',
      dataIndex: 'type',
      key: 'type',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!classDetail) {
    return (
      <div style={{ padding: '20px' }}>
        <Typography.Text type="danger">未找到班级信息</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => router.back()}
          style={{ marginBottom: 16, position: 'absolute', right: '280px' }}
        >
          返回
        </Button>
        <Title level={2} style={{ margin: 0 }}>
          班级详情 - {className || '未知班级'}
        </Title>
        <Text type="secondary">
          查看班级的详细信息和学生名单
        </Text>
      </div>

      {/* 班级基本信息 */}
      <Card title="班级基本信息" style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="班级名称">
            {classDetail.name}
          </Descriptions.Item>
          <Descriptions.Item label="班级状态">
            <Tag color={classDetail.isActive ? 'green' : 'red'}>
              {classDetail.isActive ? '启用' : '禁用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="班主任">
            {classDetail.teacherNames?.join('、') || '未分配'}
          </Descriptions.Item>
          <Descriptions.Item label="学生人数">
            {studentTableData.length} 人
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(classDetail.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {new Date(classDetail.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 学生列表 */}
      <Card 
        title={
          <Space>
            <UserOutlined />
            学生名单 ({studentTableData.length}人)
          </Space>
        } 
        style={{ marginBottom: 24 }}
      >
        {studentTableData.length > 0 ? (
          <Table
            columns={studentColumns}
            dataSource={studentTableData}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 名学生`,
            }}
            rowKey="id"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无学生信息
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClassDetailPage; 