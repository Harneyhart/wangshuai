'use client';

import { useState, useEffect } from 'react';
import { App, Table, Button, Space, Modal, Form, Input, InputNumber, message, Tag, Descriptions, Typography, Card, Row, Col, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface GradingRecord {
  key: string;
  homework: string;
  studentName: string;
  submitTime: string;
  score?: number;
  maxScore: number;
  comment?: string;
  status: '未评分' | '已评分';
  description: string;
}

const HomeworkGradingPage = () => {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const homeworkId = searchParams.get('homeworkId');
  const homeworkName = searchParams.get('homeworkName');

  const [data, setData] = useState<GradingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradingModalVisible, setGradingModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GradingRecord | null>(null);
  const [gradingForm] = Form.useForm();

  // 从localStorage读取学生提交的作业数据
  useEffect(() => {
    const loadStudentSubmissions = () => {
      try {
        const submissions = JSON.parse(localStorage.getItem('teacherSubmissions') || '[]');
        // 转换为批改记录格式
        const gradingRecords: GradingRecord[] = submissions.map((submission: any, index: number) => ({
          key: submission.key || index.toString(),
          homework: submission.homework,
          studentName: submission.studentName,
          submitTime: submission.submitTime,
          score: submission.score,
          maxScore: 100,
          comment: submission.comment,
          status: submission.score ? '已评分' : '未评分',
          description: submission.description
        }));
        setData(gradingRecords);
      } catch (error) {
        console.error('读取学生提交数据失败:', error);
        setData([]);
      }
    };

    loadStudentSubmissions();

    // 监听localStorage变化，实时更新数据
    const handleStorageChange = () => {
      loadStudentSubmissions();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 定期检查localStorage变化
    const interval = setInterval(loadStudentSubmissions, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // 打开评分弹窗
  const handleGrading = (record: GradingRecord) => {
    setSelectedRecord(record);
    gradingForm.setFieldsValue({
      score: record.score || undefined,
      comment: record.comment || ''
    });
    setGradingModalVisible(true);
  };

  // 提交评分
  const handleSubmitGrading = async () => {
    try {
      const values = await gradingForm.validateFields();
      
      if (!selectedRecord) return;

      // 更新localStorage中的数据
      const submissions = JSON.parse(localStorage.getItem('teacherSubmissions') || '[]');
      const updatedSubmissions = submissions.map((submission: any) => {
        if (submission.key === selectedRecord.key) {
          return {
            ...submission,
            score: values.score,
            comment: values.comment,
            gradedTime: new Date().toISOString()
          };
        }
        return submission;
      });
      
      localStorage.setItem('teacherSubmissions', JSON.stringify(updatedSubmissions));
      
      // 更新本地状态
      setData(prev => prev.map(record => 
        record.key === selectedRecord.key 
          ? { ...record, score: values.score, comment: values.comment, status: '已评分' as const }
          : record
      ));

      message.success('评分提交成功');
      setGradingModalVisible(false);
      setSelectedRecord(null);
      gradingForm.resetFields();
    } catch (error) {
      console.error('评分提交失败:', error);
    }
  };

  // 导出成绩
  const handleExport = () => {
    const gradedRecords = data.filter(record => record.status === '已评分');
    
    if (gradedRecords.length === 0) {
      message.warning('暂无已评分的作业可导出');
      return;
    }

    // 创建CSV内容
    const csvContent = [
      ['学生姓名', '作业名称', '提交时间', '得分', '满分', '评语'],
      ...gradedRecords.map(record => [
        record.studentName,
        record.homework,
        new Date(record.submitTime).toLocaleString(),
        record.score || 0,
        record.maxScore,
        record.comment || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${homeworkName || '作业'}_成绩表_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success('成绩导出成功');
  };

  const columns: ColumnsType<GradingRecord> = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 80,
      render: (_: any, _record: any, idx: number) => idx + 1,
    },
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      width: 120,
      align: 'center' as const,
    },
    {
      title: '作业名称',
      dataIndex: 'homework',
      width: 150,
      render: (text: string) => (
        <div style={{
          height: 48,
          lineHeight: '48px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis'
        }}>
          {text}
        </div>
      )
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      width: 150,
      align: 'center' as const,
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: '评分',
      dataIndex: 'score',
      width: 100,
      align: 'center' as const,
      render: (score: number, record: GradingRecord) => (
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: score ? '#1890ff' : '#999' }}>
            {score || '-'} / {record.maxScore}
          </div>
          <Tag color={record.status === '已评分' ? 'green' : 'orange'} style={{ marginTop: 4 }}>
            {record.status}
          </Tag>
        </div>
      )
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 150,
      align: 'center' as const,
      render: (_: any, record: GradingRecord) => (
        <Space size="small">
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleGrading(record)}
          >
            评分
          </Button>
          <Button 
            type="default" 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={() => {
              // 查看作业详情
              Modal.info({
                title: '作业详情',
                width: 600,
                content: (
                  <div>
                    <Descriptions column={1} bordered>
                      <Descriptions.Item label="学生姓名">{record.studentName}</Descriptions.Item>
                      <Descriptions.Item label="作业名称">{record.homework}</Descriptions.Item>
                      <Descriptions.Item label="提交内容">{record.description}</Descriptions.Item>
                      <Descriptions.Item label="提交时间">
                        {new Date(record.submitTime).toLocaleString()}
                      </Descriptions.Item>
                      {record.score && (
                        <Descriptions.Item label="当前得分">{record.score} / {record.maxScore}</Descriptions.Item>
                      )}
                      {record.comment && (
                        <Descriptions.Item label="评语">{record.comment}</Descriptions.Item>
                      )}
                    </Descriptions>
                  </div>
                )
              });
            }}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ];

  const gradedCount = data.filter(record => record.status === '已评分').length;
  const totalCount = data.length;
  const averageScore = gradedCount > 0 
    ? Math.round(data.filter(record => record.status === '已评分').reduce((sum, record) => sum + (record.score || 0), 0) / gradedCount)
    : 0;

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
          作业批改 - {homeworkName || '未知作业'}
        </Title>
        <Text type="secondary">
          对学生提交的作业进行评分和批改
        </Text>
      </div>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总提交数" value={totalCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已批改" value={gradedCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待批改" value={totalCount - gradedCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均分" value={averageScore} suffix="/ 100" />
          </Card>
        </Col>
      </Row>

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Space>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={gradedCount === 0}
          >
            导出成绩
          </Button>
        </Space>
      </div>

      {/* 作业列表 */}
      <Table
        columns={columns}
        dataSource={data}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        loading={loading}
        rowClassName={(record) => record.status === '已评分' ? 'graded-row' : 'ungraded-row'}
      />

      {/* 评分弹窗 */}
      <Modal
        title={`评分 - ${selectedRecord?.studentName} 的作业`}
        open={gradingModalVisible}
        onOk={handleSubmitGrading}
        onCancel={() => {
          setGradingModalVisible(false);
          setSelectedRecord(null);
          gradingForm.resetFields();
        }}
        width={600}
        okText="提交评分"
        cancelText="取消"
      >
        {selectedRecord && (
          <div>
            <Descriptions column={1} bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="学生姓名">{selectedRecord.studentName}</Descriptions.Item>
              <Descriptions.Item label="作业名称">{selectedRecord.homework}</Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {new Date(selectedRecord.submitTime).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="提交内容">
                <div style={{ maxHeight: 100, overflow: 'auto' }}>
                  {selectedRecord.description}
                </div>
              </Descriptions.Item>
            </Descriptions>

            <Form form={gradingForm} layout="vertical">
              <Form.Item
                label="得分"
                name="score"
                rules={[
                  { required: true, message: '请输入得分' },
                  { type: 'number', min: 0, max: selectedRecord.maxScore, message: `得分必须在0-${selectedRecord.maxScore}之间` }
                ]}
              >
                <InputNumber
                  min={0}
                  max={selectedRecord.maxScore}
                  style={{ width: '100%' }}
                  placeholder={`请输入0-${selectedRecord.maxScore}之间的分数`}
                />
              </Form.Item>
              <Form.Item
                label="评语"
                name="comment"
                rules={[{ max: 500, message: '评语不能超过500字' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="请输入评语（可选）"
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <style jsx>{`
        .graded-row {
          background-color: #f6ffed;
        }
        .ungraded-row {
          background-color: #fff7e6;
        }
      `}</style>
    </div>
  );
};

export default HomeworkGradingPage; 