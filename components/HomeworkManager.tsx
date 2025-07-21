'use client';

import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { App, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Space, Row, Col } from 'antd';
import type { UploadFile } from 'antd';
import { getHomeworksForCurrentTeacher, getCoursePlansForCurrentTeacher, createHomework, updateHomeworkById, deleteHomework, createAttachment, getAllClasses } from '@/lib/course/actions';

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
  courseId?: string;
  attachments?: Array<{
    id: string;
    name: string;
    fileName: string;
    fileKey: string;
  }>;
}

interface HomeworkManagerProps {
  courseId: string;
}

const HomeworkManager: React.FC<HomeworkManagerProps> = ({ courseId }) => {
  const { modal, message } = App.useApp();

  const [data, setData] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 搜索相关
  const [courseSearchText, setCourseSearchText] = useState('');
  const [homeworkSearchText, setHomeworkSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredHomeworkList, setFilteredHomeworkList] = useState<Homework[]>([]);

  // 新增/编辑相关
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [editForm] = Form.useForm();
  const [editUploadFiles, setEditUploadFiles] = useState<UploadFile[]>([]);

  // 发布相关
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [publishingHomework, setPublishingHomework] = useState<Homework | null>(null);
  const [selectedClassesForPublish, setSelectedClassesForPublish] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [classSelectModalVisible, setClassSelectModalVisible] = useState(false);

  // 课程计划
  const [coursePlans, setCoursePlans] = useState<any[]>([]);
  const [selectedCoursePlanId, setSelectedCoursePlanId] = useState<string>();

  // 过滤作业数据
  useEffect(() => {
    const fetchHomeworks = async () => {
      setLoading(true);
      const result = await getHomeworksForCurrentTeacher();
      if (Array.isArray(result)) {
        // 只显示当前课程的作业
        setData(result.filter(item => {
          const plan = coursePlans.find(plan => plan.id === item.coursePlanId);
          return plan && plan.course?.id === courseId;
        }));
      }
      setLoading(false);
    };
    fetchHomeworks();
  }, [courseId]);

  // 课程计划和班级
  useEffect(() => {
    const fetchCoursePlans = async () => {
      const plans = await getCoursePlansForCurrentTeacher();
      if (Array.isArray(plans)) {
        setCoursePlans(plans);
        if (plans.length > 0) setSelectedCoursePlanId(plans[0].id);
      }
    };
    const fetchClasses = async () => {
      const classes = await getAllClasses();
      setAllClasses(classes);
    };
    fetchCoursePlans();
    fetchClasses();
  }, []);

  // 搜索相关
  useEffect(() => {
    if (!isSearching) {
      setFilteredHomeworkList(data);
    }
  }, [data, isSearching]);

  const getCurrentHomeworkList = () => (isSearching ? filteredHomeworkList : data);

  // 搜索处理
  const handleSearch = () => {
    if (!courseSearchText.trim() && !homeworkSearchText.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }
    const courseSearchTerm = courseSearchText.toLowerCase().trim();
    const homeworkSearchTerm = homeworkSearchText.toLowerCase().trim();
    const filtered = data.filter(homework => {
      let courseMatch = true;
      let homeworkMatch = true;
      if (courseSearchTerm) {
        courseMatch = homework.courseName?.toLowerCase().includes(courseSearchTerm) || false;
      }
      if (homeworkSearchTerm) {
        homeworkMatch = homework.homework?.toLowerCase().includes(homeworkSearchTerm) || false;
      }
      return courseMatch && homeworkMatch;
    });
    setFilteredHomeworkList(filtered);
    setIsSearching(true);
    if (filtered.length === 0) {
      message.info('未找到匹配的作业');
    } else {
      message.success(`找到 ${filtered.length} 个匹配的作业`);
    }
  };

  const handleClearSearch = () => {
    setCourseSearchText('');
    setHomeworkSearchText('');
    setFilteredHomeworkList(data);
    setIsSearching(false);
    message.success('已清空搜索条件');
  };

  // 删除作业
  const handleDeleteHomework = (record: Homework) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要永久删除作业 "${record.homework}" 吗？此操作不可恢复，同时会删除所有相关的提交记录。`,
      onOk: async () => {
        setData(prev => prev.filter(item => item.key !== record.key));
        try {
          await deleteHomework(record.key);
          message.success('删除成功');
        } catch (err) {
          message.error('删除失败');
          setData(prev => [...prev, record]);
        }
      },
    });
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    modal.confirm({
      title: '确认删除',
      content: `确定要永久删除选中的 ${selectedRowKeys.length} 个作业吗？此操作不可恢复，同时会删除所有相关的提交记录。`,
      onOk: async () => {
        const keysToDelete = selectedRowKeys.map(idx => getCurrentHomeworkList()[idx as number]?.key);
        const recordsToDelete = selectedRowKeys.map(idx => getCurrentHomeworkList()[idx as number]).filter(Boolean);
        setData(prev => prev.filter(item => !keysToDelete.includes(item.key)));
        setSelectedRowKeys([]);
        try {
          await Promise.all(recordsToDelete.map(record => deleteHomework(record.key)));
          message.success('删除成功');
        } catch (err) {
          message.error('删除失败');
          setData(prev => [...prev, ...recordsToDelete]);
        }
      },
    });
  };

  // 表格列
  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 60,
      align: 'center' as const,
      render: (_: any, _record: any, idx: number) => idx + 1,
    },
    {
      title: '课程名称',
      dataIndex: 'courseName',
      width: 120,
      render: (text: string) => text || '未知课程',
    },
    {
      title: '作业名称',
      dataIndex: 'homework',
      width: 150,
      render: (text: string) => text,
    },
    {
      title: '作业描述',
      dataIndex: 'description',
      width: 250,
      ellipsis: true,
      render: (text: string) => <div style={{ color: '#666' }}>{text || '暂无描述'}</div>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 140,
      align: 'center' as const,
      render: (text: string) => (
        <span style={{ color: '#666', fontSize: '13px' }}>
          {text ? dayjs(text).format('MM-DD HH:mm') : '-'}
        </span>
      ),
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      width: 140,
      align: 'center' as const,
      render: (text: string) => {
        const isOverdue = text && dayjs(text).isBefore(dayjs());
        return (
          <span style={{
            color: isOverdue ? '#ff4d4f' : '#666',
            fontSize: '13px',
            fontWeight: isOverdue ? 600 : 400
          }}>
            {text ? dayjs(text).format('MM-DD HH:mm') : '-'}
          </span>
        );
      },
    },
    {
      title: '发布状态',
      dataIndex: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={status === '已发布' ? 'success' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 240,
      align: 'center' as const,
      render: (_: any, record: Homework) => (
        <Space size="small">
          <Button type="link" size="small" style={{ color: '#1890ff' }}
            onClick={() => {
              setEditingHomework(record);
              editForm.setFieldsValue({
                homework: record.homework,
                description: record.description,
                deadline: record.deadline ? dayjs(record.deadline) : null,
              });
              setEditUploadFiles([]);
              setEditModalVisible(true);
            }}
          >编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDeleteHomework(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>作业管理</div>
      <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
        <Button type="primary" onClick={() => { form.resetFields(); setIsModalVisible(true); }}>新增作业模板</Button>
        <Button danger onClick={handleBatchDelete} disabled={selectedRowKeys.length === 0}>批量删除</Button>
      </div>
      <Table
        columns={columns}
        dataSource={getCurrentHomeworkList()}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: getCurrentHomeworkList().length,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          onChange: (page, pageSize) => {
            setCurrentPage(page);
            setPageSize(pageSize);
          },
          showTotal: (total) => isSearching ? `搜索结果：共 ${total} 条作业` : `共 ${total} 条作业`,
          showQuickJumper: true,
          size: 'default',
        }}
        loading={loading}
        bordered
        size="middle"
        rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
        rowKey="key"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
      />

      {/* 新增作业弹窗 */}
      <Modal
        title="新增作业模板"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setUploadFiles([]);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!values.coursePlanId) {
              message.error('请选择课程计划');
              return;
            }
            const selectedCoursePlan = coursePlans.find(plan => plan.id === values.coursePlanId);
            if (!selectedCoursePlan) {
              message.error('所选课程计划不存在，请重新选择');
              return;
            }
            const homeworkData = {
              coursePlanId: selectedCoursePlan.id,
              name: values.homework,
              description: values.description,
              order: data.length + 1,
              deadline: values.deadline ? values.deadline.toDate() : new Date(),
              isActive: 0,
            };
            try {
              const res = await createHomework(homeworkData);
              if (res && res.length > 0) {
                if (uploadFiles.length > 0) {
                  for (const file of uploadFiles) {
                    const formData = new FormData();
                    formData.append('file', file.originFileObj as File);
                    const uploadResponse = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData,
                    });
                    if (uploadResponse.ok) {
                      const uploadResult = await uploadResponse.json();
                      if (uploadResult.status === 'success' && uploadResult.data) {
                        const attachmentData = {
                          name: file.name,
                          coursePlanId: selectedCoursePlan.id,
                          attachments: [{
                            name: file.name,
                            fileName: uploadResult.data.fileName,
                            fileKey: uploadResult.data.fileKey,
                          }],
                        };
                        await createAttachment(attachmentData);
                      }
                    }
                  }
                }
                message.success('作业模板创建成功！');
                setIsModalVisible(false);
                form.resetFields();
                setUploadFiles([]);
                setSelectedCoursePlanId(undefined);
                // 重新拉取作业列表
                const result = await getHomeworksForCurrentTeacher();
                if (Array.isArray(result)) {
                  setData(result.filter(item => {
                    const plan = coursePlans.find(plan => plan.id === item.coursePlanId);
                    return plan && plan.course?.id === courseId;
                  }));
                }
              } else {
                message.error('作业创建失败');
              }
            } catch (error) {
              message.error('作业创建失败');
            }
          }}
        >
          <Form.Item
            label="选择课程计划"
            name="coursePlanId"
            rules={[{ required: true, message: '请选择课程计划' }]}
          >
            <Select
              placeholder="请选择课程计划"
              onChange={setSelectedCoursePlanId}
              value={selectedCoursePlanId}
              showSearch
              filterOption={(input, option) =>
                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {coursePlans
                .filter(plan => plan.course?.id === courseId)
                .map(plan => (
                  <Select.Option key={plan.id} value={plan.id}>
                    {plan.course?.name || '未知课程'} - {plan.class?.name || '未知班级'}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="作业名称"
            name="homework"
            rules={[{ required: true, message: '请输入作业名称' }]}
          >
            <Input placeholder="请输入作业名称" />
          </Form.Item>
          <Form.Item
            label="作业描述"
            name="description"
          >
            <Input.TextArea placeholder="请输入作业描述" />
          </Form.Item>
          <Form.Item
            label="截止时间"
            name="deadline"
            rules={[{ required: true, message: '请选择作业截止时间' }]}
          >
            <Input type="datetime-local" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="作业附件"
            name="attachments"
          >
            <Upload
              fileList={uploadFiles}
              onChange={({ fileList }) => setUploadFiles(fileList)}
              beforeUpload={() => false}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              multiple
            >
              <Button icon={<span>📁</span>}>上传附件</Button>
            </Upload>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              支持格式：PDF、Word文档、PPT、图片、文本文件等
            </div>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建作业模板
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑作业弹窗 */}
      <Modal
        title="编辑作业"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditUploadFiles([]);
          setEditingHomework(null);
        }}
        footer={null}
        width={600}
      >
        {editingHomework && (
          <Form
            form={editForm}
            layout="vertical"
            onFinish={async (values) => {
              if (!editingHomework) return;
              try {
                const homeworkData = {
                  id: editingHomework.key,
                  coursePlanId: editingHomework.coursePlanId || '',
                  name: values.homework,
                  description: values.description || '',
                  order: data.length + 1,
                  deadline: values.deadline ? values.deadline.toDate() : new Date(),
                  isActive: editingHomework.status === '已发布' ? 1 : 0,
                };
                const res = await updateHomeworkById(homeworkData);
                if (res) {
                  message.success('作业更新成功！');
                  setEditModalVisible(false);
                  editForm.resetFields();
                  setEditUploadFiles([]);
                  setEditingHomework(null);
                  // 重新拉取作业列表
                  const result = await getHomeworksForCurrentTeacher();
                  if (Array.isArray(result)) {
                    setData(result.filter(item => {
                      const plan = coursePlans.find(plan => plan.id === item.coursePlanId);
                      return plan && plan.course?.id === courseId;
                    }));
                  }
                } else {
                  message.error('作业更新失败');
                }
              } catch (error) {
                message.error('作业更新失败');
              }
            }}
          >
            <Form.Item
              label="作业名称"
              name="homework"
              rules={[{ required: true, message: '请输入作业名称' }]}
            >
              <Input placeholder="请输入作业名称" />
            </Form.Item>
            <Form.Item
              label="作业描述"
              name="description"
            >
              <Input.TextArea placeholder="请输入作业描述" rows={4} />
            </Form.Item>
            <Form.Item
              label="截止时间"
              name="deadline"
              rules={[{ required: true, message: '请选择作业截止时间' }]}
            >
              <Input type="datetime-local" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  保存修改
                </Button>
                <Button onClick={() => {
                  setEditModalVisible(false);
                  editForm.resetFields();
                  setEditUploadFiles([]);
                  setEditingHomework(null);
                }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default HomeworkManager;