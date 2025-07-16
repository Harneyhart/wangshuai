'use client';

// 批改作业页面
import { useState, useEffect } from 'react';
import { App, Table, Button, Space, Modal, Form, Input, InputNumber, message, Tag, Descriptions, Typography, Card, Row, Col, Statistic, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftOutlined, DownloadOutlined, EditOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import { getAllSubmissions, updateSubmissionById } from '@/lib/course/actions';
import type { SubmissionsWithRelations } from '@/lib/course/actions';

const { TextArea } = Input;
const { Title, Text } = Typography;

// 批改记录类型定义
type GradingRecord = {
  key: string;
  homework: string;
  studentName: string;
  submitTime: string;
  score?: number | null;
  maxScore: number;
  comment?: string;
  status: '未评分' | '已评分';
  description: string;
  id: string;
  studentId: string;
  homeworkId: string;
  attachments?: any[];
  courseName?: string;
  className?: string;
};

const HomeworkGradingPage = () => {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const homeworkId = searchParams.get('homeworkId');
  const homeworkName = searchParams.get('homeworkName');
  const studentName = searchParams.get('studentName');
  const courseName = searchParams.get('courseName');

  const [data, setData] = useState<GradingRecord[]>([]);
  const [filteredData, setFilteredData] = useState<GradingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradingModalVisible, setGradingModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GradingRecord | null>(null);
  const [gradingForm] = Form.useForm();
  const [totalStudentCount, setTotalStudentCount] = useState(0);
  const [classStudentCounts, setClassStudentCounts] = useState<{[className: string]: number}>({});

  // 搜索相关状态
  const [courseOptions, setCourseOptions] = useState<{label: string, value: string}[]>([]);
  const [classOptions, setClassOptions] = useState<{label: string, value: string}[]>([]);
  const [searchCourse, setSearchCourse] = useState<string>('');
  const [searchClass, setSearchClass] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // 未提交学生相关状态
  const [unsubmittedModalVisible, setUnsubmittedModalVisible] = useState(false);
  const [unsubmittedStudents, setUnsubmittedStudents] = useState<{
    studentId: string;
    studentName: string;
    className: string;
  }[]>([]);
  const [unsubmittedLoading, setUnsubmittedLoading] = useState(false);

  // 从数据库获取作业的所有学生提交数据和学生总数
  useEffect(() => {
    const loadData = async () => {
      if (!homeworkId) return;
      
      try {
        setLoading(true);
        
        // 并行获取作业提交数据和学生总数
        const [submissionsResponse, studentCountResponse] = await Promise.all([
          fetch(`/api/submissions/${homeworkId}`),
          fetch(`/api/homework/student-count?homeworkId=${homeworkId}`)
        ]);
        
        let submissionData: GradingRecord[] = [];
        
        // 处理作业提交数据
        if (submissionsResponse.ok) {
          const submissionsResult = await submissionsResponse.json();
          console.log('提交数据API响应:', submissionsResult);
          if (submissionsResult.success) {
            submissionData = submissionsResult.data || [];
            setData(submissionData);
            setFilteredData(submissionData);
            
            // 从数据中提取课程和班级选项
            const courses = Array.from(new Set(submissionData.map((item: GradingRecord) => item.courseName))).filter(Boolean) as string[];
            const classes = Array.from(new Set(submissionData.map((item: GradingRecord) => item.className))).filter(Boolean) as string[];
            
            setCourseOptions(courses.map(name => ({ label: name as string, value: name as string })));
            setClassOptions(classes.map(name => ({ label: name as string, value: name as string })));
          } else {
            console.error('API返回错误:', submissionsResult.error);
            setData([]);
            setFilteredData([]);
          }
        } else {
          console.error('获取作业提交数据API调用失败:', submissionsResponse.status);
          setData([]);
          setFilteredData([]);
        }
        
        // 处理学生总数
        if (studentCountResponse.ok) {
          const studentCountResult = await studentCountResponse.json();
          console.log('学生数量API响应:', studentCountResult);
          if (studentCountResult.success && studentCountResult.data) {
            // 设置总学生数
            setTotalStudentCount(studentCountResult.data.studentCount || 0);
            
            // 如果API返回了按班级分组的数据，使用它；否则从提交数据中推断
            if (studentCountResult.data.classCounts) {
              setClassStudentCounts(studentCountResult.data.classCounts);
                         } else {
               // 从提交数据中提取班级信息，假设每个班级大致相同的人数
               const classes = Array.from(new Set(submissionData.map((item: GradingRecord) => item.className))).filter(Boolean) as string[];
               const avgStudentsPerClass = classes.length > 0 ? Math.ceil((studentCountResult.data.studentCount || 0) / classes.length) : 0;
               
               const classCountsFromData: {[key: string]: number} = {};
               classes.forEach(className => {
                 classCountsFromData[className] = avgStudentsPerClass;
               });
               setClassStudentCounts(classCountsFromData);
             }
          } else {
            console.error('获取学生总数错误:', studentCountResult.error);
            setTotalStudentCount(0);
            setClassStudentCounts({});
          }
        } else {
          console.error('获取学生总数API调用失败:', studentCountResponse.status);
          setTotalStudentCount(0);
          setClassStudentCounts({});
        }
      } catch (error) {
        console.error('获取数据失败:', error);
        setData([]);
        setTotalStudentCount(0);
        setClassStudentCounts({});
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      // 清理函数
    };
  }, [homeworkId]);

  // 搜索逻辑
  useEffect(() => {
    let filtered = data;

    // 根据课程名称筛选
    if (searchCourse) {
      filtered = filtered.filter(item => item.courseName === searchCourse);
    }

    // 根据班级名称筛选
    if (searchClass) {
      filtered = filtered.filter(item => item.className === searchClass);
    }

    // 根据学生姓名筛选
    if (searchStudent.trim()) {
      filtered = filtered.filter(item => 
        item.studentName.toLowerCase().includes(searchStudent.toLowerCase().trim())
      );
    }

    setFilteredData(filtered);
  }, [data, searchCourse, searchClass, searchStudent]);

  // 清空搜索
  const handleClearSearch = () => {
    setSearchCourse('');
    setSearchClass('');
    setSearchStudent('');
  };

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

      // 调用API更新数据库中的评分
      const response = await fetch('/api/submissions/grade', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submissionId: selectedRecord.id,
          score: values.score,
          comment: values.comment
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
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
        } else {
          message.error(result.error || '评分提交失败');
        }
      } else {
        message.error('评分提交失败，请重试');
      }
    } catch (error) {
      console.error('评分提交失败:', error);
      message.error('评分提交失败，请重试');
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

  // 处理显示未提交学生
  const handleShowUnsubmitted = async () => {
    if (!homeworkId) {
      message.error('缺少作业ID');
      return;
    }

    try {
      setUnsubmittedLoading(true);
      const response = await fetch(`/api/homework/unsubmitted-students?homeworkId=${homeworkId}`);
      const result = await response.json();

      if (result.success) {
        setUnsubmittedStudents(result.data.unsubmittedStudents || []);
        setUnsubmittedModalVisible(true);
        
        if (result.data.unsubmittedStudents.length === 0) {
          message.success('所有学生都已提交作业！');
        }
      } else {
        message.error(`获取未提交学生列表失败: ${result.error}`);
      }
    } catch (error) {
      console.error('获取未提交学生列表失败:', error);
      message.error('获取未提交学生列表失败');
    } finally {
      setUnsubmittedLoading(false);
    }
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
      width: 130,
      align: 'center' as const,
      render: (text: string, record: GradingRecord) => (
        <div style={{ fontWeight: 500 }}>
          {text}
        </div>
      )
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      width: 175,
      align: 'center' as const,
      render: (text: string) => text ? new Date(text).toLocaleString() : (
        <span style={{ color: '#999' }}>未提交</span>
      ),
    },
    {
      title: '班级',
      dataIndex: 'className',
      width: 120,
      align: 'center' as const,
    },
    {
      title: '附件',
      dataIndex: 'attachments',
      width: 100,
      align: 'center' as const,
      render: (attachments: any[]) => (
        <div>
          {attachments && attachments.length > 0 ? (
            <Tag color="blue">
              📎 {attachments.length}个
            </Tag>
          ) : (
            <Tag color="default">无附件</Tag>
          )}
        </div>
      ),
    },
    {
      title: '评分',
      dataIndex: 'score',
      width: 200,
      align: 'center' as const,
              render: (score: number, record: GradingRecord) => (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '0 8px'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: score ? '#1890ff' : '#999' 
            }}>
              {score || '-'} / {record.maxScore}
            </div>
            <div style={{ 
              width: '1px', 
              height: '20px', 
              borderLeft: '1px dashed #d9d9d9',
              margin: '0 8px'
            }}></div>
            <Tag color={record.status === '已评分' ? 'green' : 'orange'} style={{ margin: 0 }}>
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
        <Space size="small" direction="vertical">
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
                        {record.attachments && record.attachments.length > 0 && (
                          <Descriptions.Item label="附件">
                            <Space direction="vertical" size="small">
                              {record.attachments.map((item: any, index: number) => (
                                <a
                                  key={item.attachmentId || index}
                                  href={`/api/attachment/view?key=${item.attachment?.fileKey}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#1890ff' }}
                                >
                                  📎 {item.attachment?.name || `附件${index + 1}`}
                                </a>
                              ))}
                            </Space>
                          </Descriptions.Item>
                        )}
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

        </Space>
      ),
    },
  ];

  const gradedCount = filteredData.filter(record => record.status === '已评分').length;
  const totalCount = filteredData.length;
  const allGradedCount = data.filter(record => record.status === '已评分').length;
  const averageScore = allGradedCount > 0 
    ? Math.round(data.filter(record => record.status === '已评分').reduce((sum, record) => sum + (record.score || 0), 0) / allGradedCount)
    : 0;

  // 计算应交人数：根据是否有班级筛选来动态计算
  const getExpectedStudentCount = () => {
    if (searchClass && searchClass.trim()) {
      // 如果筛选了特定班级，返回该班级的学生数
      return classStudentCounts[searchClass] || 0;
    } else {
      // 如果没有筛选班级，返回所有相关班级的学生总数
      const relevantClasses = Array.from(new Set(data.map(item => item.className))).filter(Boolean) as string[];
      return relevantClasses.reduce((total, className) => {
        return total + (classStudentCounts[className] || 0);
      }, 0);
    }
  };

  const expectedStudentCount = getExpectedStudentCount();

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
          { courseName || '当前课程'} - {homeworkName || '当前作业'}
        </Title>
        <Text type="secondary">
          查看和批改该作业的所有学生提交
        </Text>
      </div>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card style={{ backgroundColor: '#f0f2f5' }}>
            <Statistic title="应交人数" value={expectedStudentCount} />
            {(searchCourse || searchClass || searchStudent) && (
              <div style={{ fontSize: '12px', color: '#1890ff', marginTop: '4px' }}>
                {searchClass ? `(${searchClass} 班级)` : '(筛选后显示)'}
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ backgroundColor: '#f0f2f5' }}>
            <Statistic title="已提交" value={totalCount} valueStyle={{ color: 'green' }}/>
            <Statistic title="未提交" value={Math.max(0, expectedStudentCount - totalCount)} valueStyle={{ color: 'red' }} />
            {(searchCourse || searchClass || searchStudent) && (
              <div style={{ fontSize: '12px', color: '#1890ff', marginTop: '4px' }}>
                (筛选后显示)
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ backgroundColor: '#f0f2f5' }}>
            <Statistic title="已批改" value={gradedCount}valueStyle={{ color: 'green'}} />
            <Statistic title="未批改" value={totalCount - gradedCount}valueStyle={{color: 'red'}} />
            {(searchCourse || searchClass || searchStudent) && (
              <div style={{ fontSize: '12px', color: '#1890ff', marginTop: '4px' }}>
                (筛选后显示)
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ backgroundColor: '#f0f2f5' }}>
            <Statistic title="平均分" value={averageScore} suffix="/ 100" />
          </Card>
        </Col>
      </Row>

      {/* 操作区域 */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Space>
          <Button 
            type="primary" 
            icon={<UserOutlined />}
            onClick={handleShowUnsubmitted}
            loading={unsubmittedLoading}
          >
            显示未提交
          </Button>
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

      {/* 搜索区域 */}
      <div style={{
        marginBottom: '20px', 
        padding: '16px', 
        backgroundColor: '#fafafa', 
        borderRadius: '8px',
        border: '1px solid #d9d9d9',
      }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6} lg={5}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>课程名称</div>
            <Select
              placeholder="请选择课程"
              value={searchCourse || undefined}
              onChange={setSearchCourse}
              allowClear
              style={{ width: '100%' }}
              size="large"
            >
              {courseOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6} lg={5}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>班级名称</div>
            <Select
              placeholder="请选择班级"
              value={searchClass || undefined}
              onChange={setSearchClass}
              allowClear
              style={{ width: '100%' }}
              size="large"
            >
              {classOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6} lg={5}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>学生姓名</div>
            <Input
              placeholder="请输入学生姓名"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              allowClear
              style={{ width: '100%' }}
              size="large"
            />
          </Col>
          <Col xs={24} sm={24} md={6} lg={9}>
            <div style={{ marginBottom: '8px' }}>&nbsp;</div>
            <Space>
              <Button 
                onClick={handleClearSearch}
                disabled={!searchCourse && !searchClass && !searchStudent}
                size="large"
              >
                清空筛选
              </Button>
              <span style={{ color: '#666', fontSize: '14px' }}>
                显示 {filteredData.length} / {data.length} 条记录
              </span>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 作业列表 */}
      <Table
        columns={columns}
        dataSource={filteredData}
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
        width="90%"
        okText="提交评分"
        cancelText="取消"
        destroyOnClose
      >
        {selectedRecord && (
          <div style={{ display: 'flex', gap: '16px', minHeight: '400px' }}>
            {/* 左侧：作业内容预览区 */}
            <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: '16px', padding: '16px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
                  📝 作业内容
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  学生：{selectedRecord.studentName} | 提交时间：{new Date(selectedRecord.submitTime).toLocaleString()}
                </div>
              </div>
              
              {/* 作业描述内容 */}
              <div 
                style={{ 
                  fontSize: '14px', 
                  lineHeight: '1.6', 
                  color: '#333',
                  whiteSpace: 'pre-wrap',
                  marginBottom: '16px'
                }}
              >
                {selectedRecord.description}
              </div>

              {/* 学生提交的附件 */}
              {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#1890ff' }}>
                    📎 学生提交的附件 ({selectedRecord.attachments.length}个)
                  </div>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {selectedRecord.attachments.map((item: any, index: number) => {
                      const fileName = item.attachment?.name || `附件${index + 1}`;
                      const fileExtension = fileName.split('.').pop()?.toLowerCase();
                      const isPreviewable = fileExtension === 'pdf' || fileExtension === 'xlsx' || fileExtension === 'xls';
                      
                      return (
                        <div 
                          key={item.attachmentId || index}
                          style={{ 
                            padding: '8px 12px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '6px',
                            border: '1px solid #e9ecef'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span>{isPreviewable ? '📄' : '📎'}</span>
                            <span style={{ flex: 1 }}>{fileName}</span>
                            <Space size="small">
                              {isPreviewable && (
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    const previewUrl = `/api/attachment/view?key=${item.attachment?.fileKey}`;
                                    Modal.info({
                                      title: `预览 - ${fileName}`,
                                      width: '90%',
                                      content: (
                                        <div style={{ height: '70vh', overflow: 'hidden' }}>
                                          {fileExtension === 'pdf' ? (
                                            <iframe
                                              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                              style={{
                                                width: '100%',
                                                height: '100%',
                                                border: 'none',
                                                borderRadius: '8px'
                                              }}
                                              title={fileName}
                                            />
                                          ) : (
                                            <iframe
                                              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + previewUrl)}`}
                                              style={{
                                                width: '100%',
                                                height: '100%',
                                                border: 'none',
                                                borderRadius: '8px'
                                              }}
                                              title={fileName}
                                            />
                                          )}
                                        </div>
                                      ),
                                      okText: '关闭预览',
                                      cancelText: null,
                                      onOk: () => {}
                                    });
                                  }}
                                  style={{ padding: 0, height: 'auto' }}
                                >
                                  预览
                                </Button>
                              )}
                              <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                  window.open(`/api/attachment/view?key=${item.attachment?.fileKey}`, '_blank');
                                }}
                                style={{ padding: 0, height: 'auto' }}
                              >
                                下载
                              </Button>
                            </Space>
                          </div>
                          {isPreviewable && (
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              💡 支持在线预览，点击"预览"按钮可直接查看文件内容
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Space>
                </div>
              )}
            </div>

            {/* 右侧：评分操作区 */}
            <div style={{ width: '320px' }}>
              <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
                  ⭐ 评分操作
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  作业：{selectedRecord.homework}
                  <Button type="primary" style={{ marginLeft: '133px'}}>AI评分</Button>
                </div>
              </div>

              <Form form={gradingForm} layout="vertical">
                <Form.Item
                  label={
                    <span style={{ fontWeight: 'bold' }}>
                      📊 得分 (0-{selectedRecord.maxScore})
                    </span>
                  }
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
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item
                  label={
                    <span style={{ fontWeight: 'bold' }}>
                      💬 评语
                    </span>
                  }
                  name="comment"
                  rules={[{ max: 500, message: '评语不能超过500字' }]}
                >
                  <TextArea
                    rows={6}
                    placeholder="请输入评语（可选）"
                    maxLength={500}
                    showCount
                    style={{ resize: 'none' }}
                  />
                </Form.Item>
              </Form>

              {/* 评分提示 */}
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: '#f6ffed', 
                borderRadius: '6px',
                border: '1px solid #b7eb8f'
              }}>
                <div style={{ fontSize: '12px', color: '#52c41a' }}>
                  💡 评分提示：
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  • 请根据作业完成质量和内容进行评分
                  <br />
                  • 评语可以帮助学生了解改进方向
                  <br />
                  • 评分提交后将无法修改
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 未提交学生列表弹窗 */}
      <Modal
        title={
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            📝 未提交学生列表 - {homeworkName}
          </div>
        }
        open={unsubmittedModalVisible}
        onCancel={() => setUnsubmittedModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setUnsubmittedModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {unsubmittedStudents.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#52c41a'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              太棒了！
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              所有学生都已提交作业
            </div>
          </div>
        ) : (
          <div>
            <div style={{ 
              marginBottom: '16px', 
              padding: '12px', 
              backgroundColor: '#fff7e6', 
              borderRadius: '6px',
              border: '1px solid #ffd591'
            }}>
              <Text strong style={{ color: '#fa8c16' }}>
                ⚠️ 共有 {unsubmittedStudents.length} 名学生尚未提交作业
              </Text>
            </div>
            
            <Table
              dataSource={unsubmittedStudents.map((student, index) => ({
                ...student,
                key: student.studentId,
                index: index + 1,
              }))}
              pagination={false}
              size="small"
              columns={[
                {
                  title: '序号',
                  dataIndex: 'index',
                  width: 80,
                  align: 'center' as const,
                },
                {
                  title: '学生姓名',
                  dataIndex: 'studentName',
                  align: 'center' as const,
                  render: (text: string) => (
                    <div style={{ fontWeight: 500, color: '#1890ff' }}>
                      👤 {text}
                    </div>
                  )
                },
                {
                  title: '班级名称',
                  dataIndex: 'className',
                  align: 'center' as const,
                  render: (text: string) => (
                    <Tag color="blue">{text}</Tag>
                  )
                },
              ]}
              style={{ marginTop: '16px' }}
            />
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