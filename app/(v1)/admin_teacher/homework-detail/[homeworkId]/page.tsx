'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { App, Button, Table, Tag, Modal, Typography, Space, Card, Statistic, Row, Col, Breadcrumb } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeftOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { getHomeworksForTeacher, getHomeworkStatistic, getAllClasses, updateHomeworkById } from '@/lib/course/actions';
import Link from 'next/link';

const { Title, Text } = Typography;

interface PublishedClass {
  key: string;
  classId: string;
  className: string;
  courseName: string;
  homework: string;
  publishTime: string;
  deadline: string;
  status: string;
  coursePlanId: string;
}

interface SubmissionStats {
  totalStudents: number;
  submittedCount: number;
  unsubmittedCount: number;
  gradedCount: number;
  ungradedCount: number;
}

interface Homework {
  key: string;
  homework: string;
  status: string;
  description: string | null;
  coursePlanId?: string;
  courseName?: string;
  className?: string;
  createdAt?: Date | string;
  deadline?: Date | string | null;
  attachments?: Array<{
    id: string;
    name: string;
    fileName: string;
    fileKey: string;
  }>;
}

const HomeworkDetail = () => {
  const { message, modal } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const homeworkId = params?.homeworkId as string;

  const [loading, setLoading] = useState(true);
  const [publishedClasses, setPublishedClasses] = useState<PublishedClass[]>([]);
  const [homeworkInfo, setHomeworkInfo] = useState<Homework | null>(null);
  const [submissionModalVisible, setSubmissionModalVisible] = useState(false);
  const [currentStats, setCurrentStats] = useState<SubmissionStats | null>(null);
  const [currentClassName, setCurrentClassName] = useState('');
  const [allClasses, setAllClasses] = useState<any[]>([]);

  // 获取所有班级信息
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classes = await getAllClasses();
        setAllClasses(classes);
      } catch (error) {
        console.error('获取班级信息失败:', error);
      }
    };
    fetchClasses();
  }, []);

  // 获取作业详情数据
  useEffect(() => {
    const fetchHomeworkDetail = async () => {
      if (!homeworkId) return;
      
      setLoading(true);
      try {
        const result = await getHomeworksForTeacher();
        if (Array.isArray(result)) {
          // 找到指定的作业
          const targetHomework = result.find(item => item.key === homeworkId) as Homework | undefined;
          if (targetHomework) {
            setHomeworkInfo(targetHomework);
            
            // 如果作业已发布，显示通过课程计划发布
            if (targetHomework.status === '已发布') {
              // 显示作业是通过课程计划发布的
              const publishedClassList = [{
                key: `${targetHomework.key}_courseplan`,
                classId: 'courseplan',
                className: '通过课程计划发布',
                courseName: targetHomework.courseName || '未知课程',
                homework: targetHomework.homework,
                publishTime: targetHomework.createdAt ? dayjs(targetHomework.createdAt).format('YYYY-MM-DD HH:mm') : '-',
                deadline: targetHomework.deadline ? dayjs(targetHomework.deadline).format('YYYY-MM-DD HH:mm') : '-',
                status: targetHomework.status,
                coursePlanId: targetHomework.coursePlanId || '',
              }];
              setPublishedClasses(publishedClassList);
            } else {
              setPublishedClasses([]);
            }
          }
        }
      } catch (error) {
        console.error('获取作业详情失败:', error);
        message.error('获取作业详情失败');
      } finally {
        setLoading(false);
      }
    };

    if (allClasses.length > 0) {
      fetchHomeworkDetail();
    }
  }, [homeworkId, allClasses]);

  // 查看提交情况
  const handleViewSubmissions = async (record: PublishedClass) => {
    try {
      // 获取该班级的作业提交统计
      const stats = await getHomeworkStatistic(record.classId, record.key.split('_')[0]);
      if (stats) {
        const totalStudents = Array.isArray(stats.allStudent) ? stats.allStudent.length : 0;
        const submittedCount = Array.isArray(stats.submittedStudentes) ? stats.submittedStudentes.length : 0;
        const unsubmittedCount = Array.isArray(stats.unSubmittedStudentes) ? stats.unSubmittedStudentes.length : 0;
        
        setCurrentStats({
          totalStudents,
          submittedCount,
          unsubmittedCount,
          gradedCount: 0, // 这个字段需要从其他地方获取
          ungradedCount: submittedCount,
        });
      } else {
        // 模拟数据
        setCurrentStats({
          totalStudents: 30,
          submittedCount: 25,
          unsubmittedCount: 5,
          gradedCount: 20,
          ungradedCount: 5,
        });
      }
      setCurrentClassName(record.className);
      setSubmissionModalVisible(true);
    } catch (error) {
      message.error('获取提交统计失败');
    }
  };

  // 从发布列表中移除班级（取消对特定班级的发布）
  const handleRemoveClassFromPublish = async (record: PublishedClass) => {
    modal.confirm({
      title: '确认取消发布',
      content: `确定要取消发布作业 "${record.homework}" 吗？此操作将使作业对所有学生不可见。`,
      onOk: async () => {
        try {
          if (!homeworkInfo) return;
          
          // 取消整个作业的发布状态
          const homeworkData = {
            id: homeworkInfo.key,
            coursePlanId: homeworkInfo.coursePlanId || '',
            name: homeworkInfo.homework,
            description: homeworkInfo.description || '',
            order: 1,
            deadline: homeworkInfo.deadline ? new Date(homeworkInfo.deadline) : new Date(),
            isActive: 0,
          };
          
          const res = await updateHomeworkById(homeworkData);
          if (res) {
            // 更新前端显示
            setPublishedClasses([]);
            setHomeworkInfo(prev => prev ? {...prev, status: '未发布'} : null);
            message.success('作业已取消发布');
          } else {
            message.error('取消发布失败');
          }
        } catch (error) {
          console.error('取消发布失败:', error);
          message.error('取消发布失败');
        }
      },
    });
  };

  const columns: ColumnsType<PublishedClass> = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 80,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: '发布方式',
      dataIndex: 'className',
      width: 150,
      render: (text) => (
        <Tag color="green">{text}</Tag>
      ),
    },
    {
      title: '作业名称',
      dataIndex: 'homework',
      width: 200,
      render: (text) => (
        <Text style={{ fontWeight: 500 }}>{text}</Text>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 150,
      align: 'center',
      render: (text) => (
        <Text type="secondary">{text}</Text>
      ),
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      width: 150,
      align: 'center',
      render: (text) => {
        const isOverdue = text && dayjs(text).isBefore(dayjs());
        return (
          <Text type={isOverdue ? 'danger' : 'secondary'} strong={isOverdue}>
            {text}
          </Text>
        );
      },
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewSubmissions(record)}
          >
            浏览
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveClassFromPublish(record)}
          >
            取消作业发布
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item>
          <Link href="/admin_teacher/homework">作业管理</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>作业详情</Breadcrumb.Item>
      </Breadcrumb>

      {/* 返回按钮和标题 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
          style={{ marginRight: '16px' }}
        >
          返回
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          作业详情：{homeworkInfo?.homework || '加载中...'}
        </Title>
      </div>

      {/* 作业基本信息 */}
      {homeworkInfo && (
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="作业名称" value={homeworkInfo.homework} />
            </Col>
            <Col span={6}>
              <Statistic title="创建时间" value={homeworkInfo.createdAt ? dayjs(homeworkInfo.createdAt).format('YYYY-MM-DD HH:mm') : '-'} />
            </Col>
            <Col span={6}>
              <Statistic 
                title="发布状态" 
                value={homeworkInfo.status} 
                valueStyle={{ color: homeworkInfo.status === '已发布' ? '#52c41a' : '#666' }}
              />
            </Col>
            <Col span={6}>
              <Statistic title="发布状态" value={homeworkInfo.status === '已发布' ? '已发布' : '未发布'} />
            </Col>
          </Row>
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">作业描述：</Text>
            <Text>{homeworkInfo.description || '暂无描述'}</Text>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">截止时间：</Text>
            <Text>{homeworkInfo.deadline ? dayjs(homeworkInfo.deadline).format('YYYY-MM-DD HH:mm:ss') : '未设置'}</Text>
          </div>
        </Card>
      )}

      {/* 班级发布情况表格 */}
      <Card title="发布状态" style={{ marginBottom: '24px' }}>
        {homeworkInfo?.status === '已发布' ? (
          <Table
            columns={columns}
            dataSource={publishedClasses}
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `发布状态记录`,
            }}
            bordered
            size="middle"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <Text type="secondary">该作业尚未发布，请先发布作业</Text>
          </div>
        )}
      </Card>

      {/* 提交情况查看模态框 */}
      <Modal
        title={`${currentClassName} - 作业提交情况`}
        open={submissionModalVisible}
        onCancel={() => setSubmissionModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSubmissionModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {currentStats && (
          <div>
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="班级总人数"
                    value={currentStats.totalStudents}
                    suffix="人"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="已提交人数"
                    value={currentStats.submittedCount}
                    suffix="人"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="未提交人数"
                    value={currentStats.unsubmittedCount}
                    suffix="人"
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="已批改人数"
                    value={currentStats.gradedCount}
                    suffix="人"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Text type="secondary">
                提交率：{((currentStats.submittedCount / currentStats.totalStudents) * 100).toFixed(1)}%
                <br />
                批改进度：{currentStats.submittedCount > 0 ? ((currentStats.gradedCount / currentStats.submittedCount) * 100).toFixed(1) : 0}%
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HomeworkDetail; 