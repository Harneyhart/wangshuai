'use client';

// 作业管理页面
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Pagination, DatePicker } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses,getAllClasses, createClass, deleteClass, createCoursePlan, createHomework,  deleteCoursePlan,  createAttachment, getSubmissionsByHomeworkId, updateClassById, getHomeworksForTeacher, getAllCoursePlans, updateHomeworkById, deleteHomework } from '@/lib/course/actions';
import { UserItem, StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';

const { Option } = Select;

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

const Homework = () => {
    const { modal, message } = App.useApp();

    const formClassRef = useRef<ProFormInstance>();
    const formClassPlanRef = useRef<ProFormInstance>();
    const formHomeworkRef = useRef<ProFormInstance>();
    const formAttachmentRef = useRef<ProFormInstance>();

    const [formCoursePlanData, setFormCoursePlanData] =useState<CreateCoursePlanItem>();
    const [formHomeworkData, setFormHomeworkData] =useState<CreateHomeworkItem>();
    const [formAttachmentData, setFormAttachmentData] =useState<CreateAttachmentItem>();
    const [formClassData, setFormClassData] = useState<UpdateClassItem>();

    const [list, setList] = useState<ClassesWithStudents[]>([]);
    const [modalClassVisit, setModalClassVisit] = useState(false);
    const [modalClassPlanVisit, setModalClassPlanVisit] = useState(false);
    const [modalHomeworkVisit, setModalHomeworkVisit] = useState(false);
    const [modalAttachmentVisit, setModalAttachmentVisit] = useState(false);
    const [modalSubmissionList, setModalSubmissionList] = useState({
      open: false,
      homeworkId: '',
    });

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // 编辑作业相关状态
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
    const [editForm] = Form.useForm();
    const [editUploadFiles, setEditUploadFiles] = useState<UploadFile[]>([]);

    // 新增作业上传文件状态
    const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

    // 发布弹窗相关状态
    const [publishModalVisible, setPublishModalVisible] = useState(false);
    const [publishingHomework, setPublishingHomework] = useState<Homework | null>(null);
    const [selectedClassesForPublish, setSelectedClassesForPublish] = useState<string[]>([]);
    const [allClasses, setAllClasses] = useState<ClassesWithStudents[]>([]);
    
    // 班级选择弹窗状态
    const [classSelectModalVisible, setClassSelectModalVisible] = useState(false);

    // 查看作业弹窗相关状态
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [viewingHomework, setViewingHomework] = useState<Homework | null>(null);

    // 删除作业 
    const handleDeleteHomework = (record: Homework) => {
        modal.confirm({
        title: '确认删除',
        content: `确定要永久删除作业 "${record.homework}" 吗？此操作不可恢复，同时会删除所有相关的提交记录。`,
        onOk: async () => {
          // 1. 前端先移除
          setData(prev => prev.filter(item => item.key !== record.key));
          try {
            // 调用硬删除函数
            await deleteHomework(record.key);
            message.success('删除成功');
          } catch (err) {
            message.error('删除失败');
            // 失败时回滚
            setData(prev => [...prev, record]);
          }
            },
        });
    };
    
    // 批量删除作业
    const handleBatchDelete = async () => {
      if (selectedRowKeys.length === 0) return;
      modal.confirm({
        title: '确认删除',
        content: `确定要永久删除选中的 ${selectedRowKeys.length} 个作业吗？此操作不可恢复，同时会删除所有相关的提交记录。`,
        onOk: async () => {
          // 1. 前端先移除
          const keysToDelete = selectedRowKeys.map(idx => filteredData[idx as number]?.key);
          const recordsToDelete = selectedRowKeys.map(idx => filteredData[idx as number]).filter(Boolean);
          setData(prev => prev.filter(item => !keysToDelete.includes(item.key)));
          setSelectedRowKeys([]);
          
          try {
            // 批量硬删除作业
            await Promise.all(recordsToDelete.map(record => 
              deleteHomework(record.key)
            ));
            message.success('删除成功');
          } catch (err) {
            message.error('删除失败');
            // 失败时回滚
            setData(prev => [...prev, ...recordsToDelete]);
          }
            },
            });
    };
    
    const [data, setData] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [coursePlans, setCoursePlans] = useState<any[]>([]);
    const [selectedCoursePlanId, setSelectedCoursePlanId] = useState<string>();
    const [courses, setCourses] = useState<CoursesWithPlan[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>();
    
    // 搜索相关状态
    const [courseSearchText, setCourseSearchText] = useState('');
    const [homeworkSearchText, setHomeworkSearchText] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filteredHomeworkList, setFilteredHomeworkList] = useState<Homework[]>([]);

    // 从 coursePlans 创建 courseOptions
    const courseOptions = coursePlans.map(plan => ({
        label: plan.class?.name || plan.course?.name || plan.id,
        value: plan.id,
    }));

    // 根据搜索内容判断筛选类型
    const getFilterType = () => {
        if (!isSearching || (!courseSearchText && !homeworkSearchText)) return 'all';

        const currentList = getCurrentHomeworkList();
        if (currentList.length === 0) return 'empty';

        // 如果只搜索了课程名称
        if (courseSearchText && !homeworkSearchText) {
            return 'course';
        }

        // 如果只搜索了作业名称
        if (!courseSearchText && homeworkSearchText) {
            return 'homework';
        }

        // 如果同时搜索了课程和作业
        if (courseSearchText && homeworkSearchText) {
            return 'combined';
        }

        return 'content';
    }

    // 获取筛选类型的描述信息
    const getFilterDescription = () => {
        const filterType = getFilterType();
        const currentList = getCurrentHomeworkList();
        
        switch (filterType) {
            case 'all':
                return '显示全部作业';
            case 'empty':
                return '未找到匹配的作业';
            case 'course':
                return `课程筛选: ${courseSearchText}`;
            case 'homework':
                return `作业筛选: ${homeworkSearchText}`;
            case 'combined':
                return `组合搜索: 课程"${courseSearchText}" + 作业"${homeworkSearchText}"`;
            case 'content':
                return '内容搜索';
            default:
                return '搜索结果';
        }
    }

    // 获取当前显示的作业列表
    const getCurrentHomeworkList = () => {
        return isSearching ? filteredHomeworkList : data;
    };

    // 初始化过滤列表
    useEffect(() => {
        if (!isSearching) {
            setFilteredHomeworkList(data);
        }
    }, [data, isSearching]);

    // 处理搜索
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
            
            // 如果有课程搜索条件，检查课程名称匹配
            if (courseSearchTerm) {
                courseMatch = homework.courseName?.toLowerCase().includes(courseSearchTerm) || false;
            }
            
            // 如果有作业搜索条件，检查作业名称匹配
            if (homeworkSearchTerm) {
                homeworkMatch = homework.homework?.toLowerCase().includes(homeworkSearchTerm) || false;
            }
            
            // 两个条件都必须满足（AND逻辑）
            return courseMatch && homeworkMatch;
        });
        
        setFilteredHomeworkList(filtered);
        setIsSearching(true);
        
        if (filtered.length === 0) {
            message.info('未找到匹配的作业');
        } else {
            let successMessage = '';
            if (courseSearchTerm && homeworkSearchTerm) {
                successMessage = `找到 ${filtered.length} 个匹配的作业 (课程: "${courseSearchText}" 且 作业: "${homeworkSearchText}")`;
            } else if (courseSearchTerm) {
                successMessage = `找到 ${filtered.length} 个匹配的作业 (课程: "${courseSearchText}")`;
            } else if (homeworkSearchTerm) {
                successMessage = `找到 ${filtered.length} 个匹配的作业 (作业: "${homeworkSearchText}")`;
            }
            message.success(successMessage);
        }
    };

    // 清空搜索
    const handleClearSearch = () => {
        setCourseSearchText('');
        setHomeworkSearchText('');
        setFilteredHomeworkList(data);
        setIsSearching(false);
        message.success('已清空搜索条件');
    };

    // 根据搜索关键词过滤数据
    const filteredData = getCurrentHomeworkList();


    useEffect(() => {
        const fetchHomeworks = async () => {
            setLoading(true);
            const result = await getHomeworksForTeacher();
            if (Array.isArray(result)) {
                setData(result.map(item => ({
                    ...item,
                    createdAt: item.createdAt ? (typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()) : undefined,
                    deadline: item.deadline ? (typeof item.deadline === 'string' ? item.deadline : item.deadline?.toISOString()) : undefined,
                    attachments: item.attachments || [],
                })));
            } else if (result.error) {
                message.error(result.error);
            }
            setLoading(false);
        };

        fetchHomeworks();
    }, []);

    useEffect(() => {
        const fetchCoursePlans = async () => {
            const plans = await getAllCoursePlans();
            setCoursePlans(plans);
            if (plans.length > 0) setSelectedCoursePlanId(plans[0].id);
        };
        
        const fetchClasses = async () => {
            const classes = await getAllClasses();
            setAllClasses(classes);
        };
        
        const fetchCourses = async () => {
            const coursesData = await getAllCourses();
            setCourses(coursesData);
        };
        
        fetchCoursePlans();
        fetchClasses();
        fetchCourses();
    }, []);

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const hasSelected = selectedRowKeys.length > 0;

    const handleDelete = () => {
        // ... existing code ...
    };

    const columns = [
        {
            title: <input 
                type="checkbox"
                checked={selectedRowKeys.length === getCurrentHomeworkList().length && getCurrentHomeworkList().length > 0}
                onChange={e => {
                    if (e.target.checked) {
                        setSelectedRowKeys(getCurrentHomeworkList().map((_, idx) => idx));
                    } else {
                        setSelectedRowKeys([]);
                    }
                }}
                style={{ transform: 'scale(1.1)' }}
            />,
            dataIndex: 'select',
            width: 50,
            align: 'center' as const,
            render: (_: any, _record: any, idx: number) => (
                <input
                    type="checkbox"
                    checked={selectedRowKeys.includes(idx)}
                    onChange={e => {
                        const key = idx;
                        if (e.target.checked) {
                            setSelectedRowKeys([...selectedRowKeys, key]);
                        } else {
                            setSelectedRowKeys(selectedRowKeys.filter(k => k !== key));
                        }
                    }}
                    style={{ transform: 'scale(1.1)' }}
                />
            ),
        },
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
            render: (text: string, record: Homework) => {
                const courseName = record.courseName || '未知课程';
                if (isSearching && courseSearchText && courseName !== '未知课程') {
                    // 高亮课程搜索关键词
                    const parts = courseName.split(new RegExp(`(${courseSearchText})`, 'gi'));
                    return (
                        <span style={{ fontWeight: 500 }} title={courseName}>
                            {parts.map((part, index) => 
                                part.toLowerCase() === courseSearchText.toLowerCase() ? (
                                    <span key={index} style={{ 
                                        backgroundColor: '#e6f7ff', 
                                        color: '#1890ff',
                                        padding: '2px 4px',
                                        borderRadius: '3px',
                                        fontWeight: 600
                                    }}>
                                        {part}
                                    </span>
                                ) : part
                            )}
                        </span>
                    );
                }
                return courseName;
            },
        },
        {
            title: '作业名称',
            dataIndex: 'homework',
            width: 150,
            render: (text: string) => {
                if (isSearching && homeworkSearchText && text) {
                    // 高亮作业搜索关键词
                    const parts = text.split(new RegExp(`(${homeworkSearchText})`, 'gi'));
                    return (
                        <span style={{ fontWeight: 500 }} title={text}>
                            {parts.map((part, index) => 
                                part.toLowerCase() === homeworkSearchText.toLowerCase() ? (
                                    <span key={index} style={{ 
                                        backgroundColor: '#f0ffff', 
                                        color: '#13c2c2',
                                        padding: '2px 4px',
                                        borderRadius: '3px',
                                        fontWeight: 600
                                    }}>
                                        {part}
                                    </span>
                                ) : part
                            )}
                        </span>
                    );
                }
                return (
                    <span style={{ fontWeight: 500 }} title={text}>
                        {text}
                    </span>
                );
            },
        },
        {
            title: <span style={{ fontWeight: 600 }}>作业描述</span>,
            dataIndex: 'description',
            width: 250,
            ellipsis: true,
            render: (text: string, record: Homework) => (
                <div>
                    <div style={{ color: '#666', marginBottom: '4px' }} title={text || '暂无描述'}>
                        {text || '暂无描述'}
                    </div>
                    {record.attachments && record.attachments.length > 0 && (
                        <Button 
                            type="link" 
                            size="small" 
                            style={{ padding: 0, height: 'auto', color: '#1890ff' }}
                            onClick={() => {
                                // 显示附件列表模态框
                                Modal.info({
                                    title: `${record.homework} - 作业附件`,
                                    width: 600,
                                    content: (
                                        <div style={{ marginTop: '16px' }}>
                                            {record.attachments!.map((attachment, index) => (
                                                <div key={index} style={{ 
                                                    padding: '8px 12px', 
                                                    border: '1px solid #d9d9d9', 
                                                    borderRadius: '6px', 
                                                    marginBottom: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 500 }}>{attachment.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                                            {attachment.fileName}
                                                        </div>
                                                    </div>
                                                    <Space>
                                                        <Button 
                                                            size="small" 
                                                            type="primary"
                                                            onClick={() => window.open(`/api/attachment/view?key=${attachment.fileKey}`, '_blank')}
                                                        >
                                                            预览
                                                        </Button>
                                                        <Button 
                                                            size="small"
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = `/api/attachment/view?key=${attachment.fileKey}&download=1`;
                                                                link.download = attachment.fileName;
                                                                link.click();
                                                            }}
                                                        >
                                                            下载
                                                        </Button>
                                                    </Space>
                                                </div>
                                            ))}
                                        </div>
                                    ),
                                });
                            }}
                        >
                            📎 查看附件 ({record.attachments.length})
                        </Button>
                    )}
                </div>
            ),
        },
        {
            title: <span style={{ fontWeight: 600 }}>创建时间</span>,
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
            title: <span style={{ fontWeight: 600 }}>截止时间</span>,
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
            title: <span style={{ fontWeight: 600 }}>发布状态</span>,
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
            title: <span style={{ fontWeight: 600 }}>操作</span>,
            dataIndex: 'action',
            width: 240,
            align: 'center' as const,
            render: (_: any, record: Homework) => (
                <Space size="small">
                    <Button 
                        type="link" 
                        size="small"
                        style={{ color: '#1890ff' }}
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
                    >
                        编辑
                    </Button>
                    <Button type="link" 
                        size="small"
                        style={{ color: '#1890ff' }}
                        onClick={() => {
                            setViewingHomework(record);
                            setViewModalVisible(true);
                        }}>
                        查看
                    </Button>
                    <Button 
                        type="link" 
                        size="small"
                        style={{ color: record.status === '已发布' ? '#faad14' : '#52c41a' }}
                        onClick={() => { 
                            setPublishingHomework(record); 
                            setSelectedClassesForPublish([]); // 重置班级选择
                            setPublishModalVisible(true); 
                        }}
                    >
                        {record.status === '已发布' ? '取消发布' : '发布'}
                    </Button>
                    <Button 
                        type="link" 
                        size="small"
                        danger
                        onClick={() => { handleDeleteHomework(record); }}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ];
    

    return (
        <>
            <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                    作业管理
                </div>
                <div style={{ 
                    fontSize: 14, 
                    opacity: 0.9, 
                    marginTop: 8 
                }}>
                </div>
            </div>
            <div style={{ 
                background: '#fff', 
                padding: 24, 
                borderRadius: '0 0 12px 12px',
                marginTop: '0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>

            {/* 操作按钮区域 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16, gap: '10px' }}>
                <Button
                    type='primary'
                    onClick={() => {
                        form.resetFields();
                        setIsModalVisible(true);
                    }}
                >
                    新增作业模板
                </Button>
                <Button type='primary' danger onClick={handleBatchDelete} disabled={selectedRowKeys.length === 0}>
                    批量删除
                </Button>
            </div>
            <div style={{
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: '#fafafa', 
                borderRadius: '8px',
                border: '1px solid #d9d9d9',
                width: '100%'
            }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                        <Input 
                            placeholder="搜索课程名称..."
                            value={courseSearchText}
                            onChange={(e) => setCourseSearchText(e.target.value)}
                            onPressEnter={handleSearch}
                            allowClear
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                        <Input 
                            placeholder="搜索作业名称..."
                            value={homeworkSearchText}
                            onChange={(e) => setHomeworkSearchText(e.target.value)}
                            onPressEnter={handleSearch}
                            allowClear
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                        <Space size="middle">
                            <Button 
                                type="primary" 
                                onClick={handleSearch} 
                                disabled={!courseSearchText.trim() && !homeworkSearchText.trim()}
                                size="large"
                            >
                                搜索
                            </Button>
                            <Button 
                                onClick={handleClearSearch} 
                                disabled={!isSearching}
                                size="large"
                            >
                                清空
                            </Button>
                        </Space>
                    </Col>
                    <Col xs={24} sm={24} md={6} lg={10} xl={10}>
                        {isSearching && (
                            <div style={{ textAlign: 'right', paddingRight: '20px' }}>
                                <Space wrap>
                                    {courseSearchText && (
                                        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                                            课程: "{courseSearchText}"
                                        </Tag>
                                    )}
                                    {homeworkSearchText && (
                                        <Tag color="cyan" style={{ fontSize: '14px', padding: '4px 8px' }}>
                                            作业: "{homeworkSearchText}"
                                        </Tag>
                                    )}
                                    <Tag 
                                        color={getFilterType() === 'empty' ? 'red' : 'green'} 
                                        style={{ fontSize: '14px', padding: '4px 8px' }}
                                    >
                                        {getFilterDescription()} ({filteredHomeworkList.length} 个结果)
                                    </Tag>
                                </Space>
                            </div>
                        )}
                    </Col>
                </Row>
                {/* 搜索提示 */}
                {!isSearching && (
                    <Row style={{ marginTop: '8px' }}>
                        <Col span={24}>
                            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                💡 搜索提示：左侧搜索框仅搜索课程名称，右侧搜索框仅搜索作业名称。可以单独使用或组合使用两个搜索框进行精确筛选。
                            </Typography.Text>
                        </Col>
                    </Row>
                )}
            </div>
            <Table
                rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys,
                    onChange: onSelectChange,
                    columnWidth: 50,
                }}
                columns={columns}
                dataSource={filteredData}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: filteredData.length,
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
                scroll={{ x: 1500 }}
                style={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                rowClassName={(record, index) => 
                    index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
                }
            />
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
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
                    <Typography.Text type="secondary">
                        💡 这里创建作业模板，创建完成后请点击"发布"按钮选择要发布到的班级
                    </Typography.Text>
                </div>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={async (values) => {
                        // 新增作业模板逻辑
                        if (!values.courseId) {
                            message.error('请选择课程');
                            return;
                        }
                        
                        // 查找该课程对应的第一个课程计划作为模板
                        const selectedCoursePlans = coursePlans.filter(plan => plan.course?.id === values.courseId);
                        if (selectedCoursePlans.length === 0) {
                            message.error('所选课程暂无对应的课程计划，请先创建课程计划');
                            return;
                        }
                        
                        const homeworkData = {
                            coursePlanId: selectedCoursePlans[0].id,
                            name: values.homework,
                            description: values.description,
                            order: data.length + 1,
                            deadline: values.deadline ? values.deadline.toDate() : new Date(),
                            isActive: 0, // 默认设置为未发布状态
                        };
                        
                        const res = await createHomework(homeworkData);
                        if (res && res.length > 0) {
                            // 如果有上传文件，创建附件
                            if (uploadFiles.length > 0) {
                                try {
                                    for (const file of uploadFiles) {
                                        const formData = new FormData();
                                        formData.append('file', file.originFileObj as File);
                                        
                                                                                // 上传文件
                                        const uploadResponse = await fetch('/api/upload', {
                                            method: 'POST',
                                            body: formData,
                                        });
                                        
                                        if (uploadResponse.ok) {
                                            const uploadResult = await uploadResponse.json();
                                            console.log('文件上传结果:', uploadResult);
                                            
                                            if (uploadResult.status === 'success' && uploadResult.data) {
                                                // 创建附件记录，关联到课程计划
                                                const attachmentData = {
                                                    name: file.name,
                                                    coursePlanId: selectedCoursePlans[0].id, // 关联到课程计划
                                                    attachments: [{
                                                        name: file.name,
                                                        fileName: uploadResult.data.fileName,
                                                        fileKey: uploadResult.data.fileKey,
                                                    }],
                                                };
                                                
                                                await createAttachment(attachmentData);
                                            } else {
                                                console.error('文件上传失败:', uploadResult.error);
                                                throw new Error(`文件 ${file.name} 上传失败`);
                                            }
                                        } else {
                                            throw new Error(`文件 ${file.name} 上传请求失败`);
                                        }
                                    }
                                } catch (error) {
                                    console.error('附件上传失败:', error);
                                    message.warning('作业创建成功，但部分附件上传失败，请稍后重新上传');
                                }
                            }
                            
                            message.success('作业模板创建成功！');
                            setIsModalVisible(false);
                            form.resetFields();
                            setUploadFiles([]);
                            setSelectedCourseId(undefined);
                            // 重新拉取作业列表
                            const result = await getHomeworksForTeacher();
                            if (Array.isArray(result)) {
                                setData(result.map(item => ({
                                    ...item,
                                    createdAt: item.createdAt ? (typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()) : undefined,
                                    deadline: item.deadline ? (typeof item.deadline === 'string' ? item.deadline : item.deadline?.toISOString()) : undefined,
                                    attachments: item.attachments || [],
                                })));
                            }
                        } else {
                            message.error('作业创建失败');
                        }
                    }}
                >
                    <Form.Item
                        label="选择课程"
                        name="courseId"
                        rules={[{ required: true, message: '请选择课程' }]}
                    >
                        <Select
                            placeholder="请选择课程"
                            onChange={setSelectedCourseId}
                            value={selectedCourseId}
                            showSearch
                            filterOption={(input, option) =>
                                String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {courses.map(course => (
                                <Select.Option key={course.id} value={course.id}>
                                    {course.name}
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
                        <DatePicker 
                            showTime 
                            format="YYYY-MM-DD HH:mm:ss" 
                            placeholder="请选择截止时间"
                            style={{ width: '100%' }}
                        />
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
            {/* 移除了浏览和编辑模态框，改为跳转到作业详情页面 */}
            <Modal
                title={publishingHomework?.status === '已发布' ? '取消发布确认' : '发布作业到班级'}
                open={publishModalVisible}
                onCancel={() => {
                    setPublishModalVisible(false);
                    setSelectedClassesForPublish([]);
                }}
                width={600}
                footer={[
                    <Button key="cancel" onClick={() => {
                        setPublishModalVisible(false);
                        setSelectedClassesForPublish([]);
                    }}>
                        取消
                    </Button>,
                    <Button 
                        key="publish" 
                        type="primary" 
                        disabled={publishingHomework?.status !== '已发布' && selectedClassesForPublish.length === 0}
                        onClick={async () => {
                            if (!publishingHomework) {
                                message.error('未找到要操作的作业');
                                return;
                            }
        
                            try {
                                const isCurrentlyPublished = publishingHomework.status === '已发布';
                                
                                if (isCurrentlyPublished) {
                                    // 取消发布逻辑
                                    const homeworkData = {
                                        id: publishingHomework.key,
                                        coursePlanId: publishingHomework.coursePlanId || '',
                                        name: publishingHomework.homework,
                                        description: publishingHomework.description || '',
                                        order: data.length + 1,
                                        deadline: publishingHomework.deadline ? new Date(publishingHomework.deadline) : new Date(),
                                        isActive: 0,
                                    };
                                    
                                    const res = await updateHomeworkById(homeworkData);
                                    if (res) {
                                        message.success('作业已取消发布');
                                        setPublishModalVisible(false);
                                        setSelectedClassesForPublish([]);
                                        
                                        // 重新拉取作业列表
                                        const result = await getHomeworksForTeacher();
                                        if (Array.isArray(result)) {
                                            setData(result.map(item => ({
                                                ...item,
                                                createdAt: item.createdAt ? (typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()) : undefined,
                                                deadline: item.deadline ? (typeof item.deadline === 'string' ? item.deadline : item.deadline?.toISOString()) : undefined,
                                                attachments: item.attachments || [],
                                            })));
                                        }
                                    } else {
                                        message.error('操作失败');
                                    }
                                } else {
                                    // 发布到选中的班级
                                    if (selectedClassesForPublish.length === 0) {
                                        message.error('请选择要发布到的班级');
                                        return;
                                    }
                                    
                                    try {
                                        const selectedClassNames = selectedClassesForPublish
                                            .map(classId => allClasses.find(c => c.id === classId)?.name)
                                            .filter(Boolean)
                                            .join('、');
                                        
                                        // 更新作业状态为已发布
                                        const homeworkData = {
                                            id: publishingHomework.key,
                                            coursePlanId: publishingHomework.coursePlanId || '',
                                            name: publishingHomework.homework,
                                            description: publishingHomework.description || '',
                                            order: data.length + 1,
                                            deadline: publishingHomework.deadline ? new Date(publishingHomework.deadline) : new Date(),
                                            isActive: 1, // 设置为已发布
                                        };
                                        
                                        const res = await updateHomeworkById(homeworkData);
                                        if (res) {
                                            message.success(`作业已成功发布，学生可通过课程计划查看`);
                                            setPublishModalVisible(false);
                                            setSelectedClassesForPublish([]);
                                            
                                            // 重新拉取作业列表
                                            const result = await getHomeworksForTeacher();
                                            if (Array.isArray(result)) {
                                                setData(result.map(item => ({
                                                    ...item,
                                                    createdAt: item.createdAt ? (typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()) : undefined,
                                                    deadline: item.deadline ? (typeof item.deadline === 'string' ? item.deadline : item.deadline?.toISOString()) : undefined,
                                                })));
                                            }
                                        } else {
                                            message.error('作业发布失败');
                                        }
                                    } catch (error) {
                                        console.error('发布作业失败:', error);
                                        message.error('作业发布失败');
                                    }
                                }
                            } catch (error) {
                                console.error('操作失败:', error);
                                message.error('操作失败');
                            }
                        }}
                    >
                        {publishingHomework?.status === '已发布' ? '确认取消发布' : `发布到 ${selectedClassesForPublish.length} 个班级`}
                    </Button>
                ]}
            >
                {publishingHomework && (
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                                                        <p><b>作业名称：</b>{publishingHomework.homework}</p>
                            <p><b>课程名称：</b>{publishingHomework.courseName || '未知课程'}</p>
                            <p><b>作业描述：</b>{publishingHomework.description}</p>
                            <p><b>创建时间：</b>{publishingHomework.createdAt ? dayjs(publishingHomework.createdAt).format('YYYY-MM-DD HH:mm:ss') : '未设置'}</p>
                            <p><b>截止时间：</b>{publishingHomework.deadline ? dayjs(publishingHomework.deadline).format('YYYY-MM-DD HH:mm:ss') : '未设置'}</p>
                            <p><b>当前状态：</b>{publishingHomework.status}</p>
                        </div>
                        
                        {publishingHomework.status === '已发布' ? (
                            <div style={{ color: '#ff4d4f', fontWeight: 'bold', padding: '12px', backgroundColor: '#fff2f0', borderRadius: '6px' }}>
                                ⚠️ 取消发布后，该作业将对所有已发布班级的学生不可见，学生无法在"我的作业"界面查看。
                            </div>
                        ) : (
                            <div>
                                <Divider orientation="left" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                    选择要发布到的班级
                                </Divider>
                                <div style={{ marginBottom: '16px' }}>
                                    <Button 
                                        type="dashed" 
                                        style={{ width: '100%', height: '40px' }}
                                        onClick={() => setClassSelectModalVisible(true)}
                                    >
                                        {selectedClassesForPublish.length === 0 
                                            ? '点击选择要发布到的班级' 
                                            : `已选择 ${selectedClassesForPublish.length} 个班级`
                                        }
                                    </Button>
                                    {selectedClassesForPublish.length > 0 && (
                                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
                                            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                                已选择班级：
                                            </Typography.Text>
                                            <div style={{ marginTop: '4px' }}>
                                                {selectedClassesForPublish.map(classId => {
                                                    const classItem = allClasses.find(c => c.id === classId);
                                                    return (
                                                        <Tag key={classId} color="green" style={{ margin: '2px' }}>
                                                            {classItem?.name}
                                                        </Tag>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ color: '#1890ff', fontWeight: 'bold', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '6px' }}>
                                    📢 发布后，选中班级的学生可以在"我的作业"界面查看和提交该作业。
                                    {selectedClassesForPublish.length > 0 && (
                                        <div style={{ marginTop: '8px', fontSize: '14px' }}>
                                            已选择 {selectedClassesForPublish.length} 个班级：
                                            {selectedClassesForPublish.map(classId => {
                                                const classItem = allClasses.find(c => c.id === classId);
                                                return classItem?.name;
                                            }).join('、')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
            
            {/* 班级选择弹窗 */}
            <Modal
                title="选择要发布到的班级"
                open={classSelectModalVisible}
                onCancel={() => setClassSelectModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setClassSelectModalVisible(false)}>
                        取消
                    </Button>,
                    <Button 
                        key="confirm" 
                        type="primary" 
                        onClick={() => {
                            setClassSelectModalVisible(false);
                            message.success(`已选择 ${selectedClassesForPublish.length} 个班级`);
                        }}
                    >
                        确定 ({selectedClassesForPublish.length})
                    </Button>
                ]}
                width={600}
            >
                <div>
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography.Text type="secondary">
                                💡 选择要发布作业的班级，可以多选。每个班级的学生都能在"我的作业"界面看到该作业。
                            </Typography.Text>
                            <Space>
                                <Button 
                                    size="small" 
                                    onClick={() => setSelectedClassesForPublish(allClasses.map(c => c.id))}
                                    disabled={selectedClassesForPublish.length === allClasses.length}
                                >
                                    全选
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={() => setSelectedClassesForPublish([])}
                                    disabled={selectedClassesForPublish.length === 0}
                                >
                                    清空
                                </Button>
                            </Space>
                        </div>
                    </div>
                    
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {allClasses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                暂无可用班级
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                                {allClasses.map(classItem => (
                                    <div 
                                        key={classItem.id}
                                        style={{
                                            border: `2px solid ${selectedClassesForPublish.includes(classItem.id) ? '#52c41a' : '#d9d9d9'}`,
                                            borderRadius: '8px',
                                            padding: '12px',
                                            cursor: 'pointer',
                                            backgroundColor: selectedClassesForPublish.includes(classItem.id) ? '#f6ffed' : '#fff',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onClick={() => {
                                            if (selectedClassesForPublish.includes(classItem.id)) {
                                                setSelectedClassesForPublish(prev => prev.filter(id => id !== classItem.id));
                                            } else {
                                                setSelectedClassesForPublish(prev => [...prev, classItem.id]);
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '14px' }}>
                                                {classItem.name}
                                            </span>
                                            {selectedClassesForPublish.includes(classItem.id) && (
                                                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>✓</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            <div>学生人数: {classItem.students?.length || 0} 人</div>
                                            <div>创建时间: {classItem.createdAt ? dayjs(classItem.createdAt).format('YYYY-MM-DD') : '-'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {selectedClassesForPublish.length > 0 && (
                        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '6px' }}>
                            <Typography.Text strong style={{ color: '#52c41a' }}>
                                已选择 {selectedClassesForPublish.length} 个班级
                            </Typography.Text>
                            <div style={{ marginTop: '8px' }}>
                                {selectedClassesForPublish.map(classId => {
                                    const classItem = allClasses.find(c => c.id === classId);
                                    const studentCount = classItem?.students?.length || 0;
                                    return (
                                        <Tag key={classId} color="green" style={{ margin: '2px 4px 2px 0' }}>
                                            {classItem?.name} ({studentCount}人)
                                        </Tag>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            
            {/* 编辑作业模态框 */}
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
                    <div>
                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
                            <Typography.Text type="secondary">
                                💡 修改作业信息后，已发布的作业将立即更新，学生可以看到最新内容
                            </Typography.Text>
                        </div>
                        <Form
                            form={editForm}
                            layout="vertical"
                            onFinish={async (values) => {
                                if (!editingHomework) return;
                                
                                try {
                                    // 更新作业信息
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
                                        // 如果有新上传的文件，创建附件
                                        if (editUploadFiles.length > 0) {
                                            try {
                                                for (const file of editUploadFiles) {
                                                    const formData = new FormData();
                                                    formData.append('file', file.originFileObj as File);
                                                    
                                                                                         // 上传文件
                                     const uploadResponse = await fetch('/api/upload', {
                                         method: 'POST',
                                         body: formData,
                                     });
                                     
                                     if (uploadResponse.ok) {
                                         const uploadResult = await uploadResponse.json();
                                         console.log('编辑时文件上传结果:', uploadResult);
                                         
                                         if (uploadResult.status === 'success' && uploadResult.data) {
                                             // 创建附件记录，关联到课程计划
                                             const attachmentData = {
                                                 name: file.name,
                                                 coursePlanId: editingHomework.coursePlanId, // 关联到课程计划
                                                 attachments: [{
                                                     name: file.name,
                                                     fileName: uploadResult.data.fileName,
                                                     fileKey: uploadResult.data.fileKey,
                                                 }],
                                             };
                                             
                                             await createAttachment(attachmentData);
                                         } else {
                                             console.error('文件上传失败:', uploadResult.error);
                                             throw new Error(`文件 ${file.name} 上传失败`);
                                         }
                                     } else {
                                         throw new Error(`文件 ${file.name} 上传请求失败`);
                                     }
                                                }
                                                                                     } catch (error) {
                                             console.error('附件上传失败:', error);
                                             message.warning('作业更新成功，但部分附件上传失败，请稍后重新上传');
                                         }
                                        }
                                        
                                        message.success('作业更新成功！');
                                        setEditModalVisible(false);
                                        editForm.resetFields();
                                        setEditUploadFiles([]);
                                        setEditingHomework(null);
                                        
                                        // 重新拉取作业列表
                                        const result = await getHomeworksForTeacher();
                                        if (Array.isArray(result)) {
                                            setData(result.map(item => ({
                                                ...item,
                                                createdAt: item.createdAt ? (typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()) : undefined,
                                                deadline: item.deadline ? (typeof item.deadline === 'string' ? item.deadline : item.deadline?.toISOString()) : undefined,
                                                attachments: item.attachments || [],
                                            })));
                                        }
                                    } else {
                                        message.error('作业更新失败');
                                    }
                                } catch (error) {
                                    console.error('更新失败:', error);
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
                                <DatePicker 
                                    showTime 
                                    format="YYYY-MM-DD HH:mm:ss" 
                                    placeholder="请选择截止时间"
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                            <Form.Item
                                label="添加新附件"
                                name="newAttachments"
                            >
                                <Upload
                                    fileList={editUploadFiles}
                                    onChange={({ fileList }) => setEditUploadFiles(fileList)}
                                    beforeUpload={() => false}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                                    multiple
                                >
                                </Upload>
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                                    支持格式：PDF、Word文档、PPT、图片、文本文件等
                                </div>
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
                    </div>
                )}
            </Modal>

            {/* 查看作业详情弹窗 */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span>
                        <span>作业详情</span>
                    </div>
                }
                open={viewModalVisible}
                onCancel={() => {
                    setViewModalVisible(false);
                    setViewingHomework(null);
                }}
                footer={[
                    <Button key="close" onClick={() => {
                        setViewModalVisible(false);
                        setViewingHomework(null);
                    }}>
                        关闭
                    </Button>
                ]}
                width={700}
                centered
            >
                {viewingHomework && (
                    <div style={{ padding: '16px 0' }}>
                        {/* 作业基本信息 */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ 
                                padding: '16px', 
                                backgroundColor: '#f8f9fa', 
                                borderRadius: '8px',
                                border: '1px solid #e9ecef'
                            }}>
                                <Row gutter={[16, 16]}>
                                    <Col span={24}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <Typography.Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                                                作业名称：
                                            </Typography.Text>
                                            <Typography.Text style={{ fontSize: '16px', marginLeft: '8px' }}>
                                                {viewingHomework.homework}
                                            </Typography.Text>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <Typography.Text strong style={{ color: '#666' }}>
                                                课程名称：
                                            </Typography.Text>
                                            <Typography.Text style={{ marginLeft: '8px' }}>
                                                {viewingHomework.courseName || '未知课程'}
                                            </Typography.Text>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <Typography.Text strong style={{ color: '#666' }}>
                                                发布状态：
                                            </Typography.Text>
                                            <Tag color={viewingHomework.status === '已发布' ? 'success' : 'default'} style={{ marginLeft: '8px' }}>
                                                {viewingHomework.status}
                                            </Tag>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <Typography.Text strong style={{ color: '#666' }}>
                                                创建时间：
                                            </Typography.Text>
                                            <Typography.Text style={{ marginLeft: '8px' }}>
                                                {viewingHomework.createdAt ? dayjs(viewingHomework.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                                            </Typography.Text>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <Typography.Text strong style={{ color: '#666' }}>
                                                截止时间：
                                            </Typography.Text>
                                            <Typography.Text 
                                                style={{ 
                                                    marginLeft: '8px',
                                                    color: viewingHomework.deadline && dayjs(viewingHomework.deadline).isBefore(dayjs()) ? '#ff4d4f' : '#666'
                                                }}
                                            >
                                                {viewingHomework.deadline ? dayjs(viewingHomework.deadline).format('YYYY-MM-DD HH:mm:ss') : '-'}
                                            </Typography.Text>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </div>

                        {/* 作业内容 */}
                        <div style={{ marginBottom: '24px' }}>
                            <Typography.Title level={5} style={{ marginBottom: '12px', color: '#1890ff' }}>
                                📝 作业内容
                            </Typography.Title>
                            <div style={{ 
                                padding: '16px', 
                                backgroundColor: '#fafafa', 
                                borderRadius: '8px',
                                border: '1px solid #d9d9d9',
                                minHeight: '80px'
                            }}>
                                <Typography.Text style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    lineHeight: '1.6',
                                    color: viewingHomework.description ? '#333' : '#999'
                                }}>
                                    {viewingHomework.description || '暂无作业内容描述'}
                                </Typography.Text>
                            </div>
                        </div>

                        {/* 发布目标班级 */}
                        <div style={{ marginBottom: '24px' }}>
                            <Typography.Title level={5} style={{ marginBottom: '12px', color: '#1890ff' }}>
                                🎯 发布目标班级
                            </Typography.Title>
                            <div style={{ 
                                padding: '16px', 
                                backgroundColor: viewingHomework.status === '已发布' ? '#f6ffed' : '#fff2f0', 
                                borderRadius: '8px',
                                border: viewingHomework.status === '已发布' ? '1px solid #b7eb8f' : '1px solid #ffccc7'
                            }}>
                                {viewingHomework.status === '已发布' ? (
                                    <>
                                        {/* 发布状态指示器 */}
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '16px',
                                            padding: '8px 12px',
                                            backgroundColor: '#fff',
                                            borderRadius: '6px',
                                            border: '1px solid #d9d9d9'
                                        }}>
                                            <div style={{ 
                                                width: '8px', 
                                                height: '8px', 
                                                borderRadius: '50%', 
                                                backgroundColor: '#52c41a', 
                                                marginRight: '8px' 
                                            }}></div>
                                            <Typography.Text style={{ color: '#52c41a', fontWeight: 600, fontSize: '14px' }}>
                                                已发布
                                            </Typography.Text>
                                        </div>
                                        
                                        {/* 当前发布班级 */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                                当前发布班级：
                                            </div>
                                            <div style={{ 
                                                padding: '12px', 
                                                backgroundColor: '#fff', 
                                                borderRadius: '6px',
                                                border: '1px solid #d9d9d9',
                                                marginBottom: '12px'
                                            }}>
                                                <Typography.Text style={{ color: '#52c41a', fontWeight: 600, fontSize: '16px' }}>
                                                    {viewingHomework.className || '未知班级'}
                                                </Typography.Text>
                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                    该作业已发布给此班级的所有学生
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* 发布时间 */}
                                        <div style={{ 
                                            padding: '8px 12px', 
                                            backgroundColor: '#fff', 
                                            borderRadius: '4px',
                                            border: '1px solid #d9d9d9',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                                📅 发布时间：
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>
                                                {viewingHomework.createdAt ? dayjs(viewingHomework.createdAt).format('YYYY-MM-DD HH:mm:ss') : '未知'}
                                            </div>
                                        </div>
                                        
                                        {/* 发布说明 */}
                                        <div style={{ 
                                            padding: '8px 12px', 
                                            backgroundColor: '#e6f7ff', 
                                            borderRadius: '4px',
                                            border: '1px solid #91d5ff'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#1890ff' }}>
                                                ✅ 该作业已成功发布给 <strong>{viewingHomework.className || '未知班级'}</strong> 的所有学生
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                学生可以在"我的作业"界面查看和提交该作业
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* 发布状态指示器 */}
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            marginBottom: '16px',
                                            padding: '8px 12px',
                                            backgroundColor: '#fff',
                                            borderRadius: '6px',
                                            border: '1px solid #d9d9d9'
                                        }}>
                                            <div style={{ 
                                                width: '8px', 
                                                height: '8px', 
                                                borderRadius: '50%', 
                                                backgroundColor: '#ff4d4f', 
                                                marginRight: '8px' 
                                            }}></div>
                                            <Typography.Text style={{ color: '#ff4d4f', fontWeight: 600, fontSize: '14px' }}>
                                                未发布
                                            </Typography.Text>
                                        </div>
                                        
                                        {/* 可发布班级列表 */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                                可发布班级：
                                            </div>
                                            <div style={{ 
                                                maxHeight: '200px', 
                                                overflowY: 'auto',
                                                border: '1px solid #d9d9d9',
                                                borderRadius: '6px',
                                                backgroundColor: '#fff'
                                            }}>
                                                {allClasses.length === 0 ? (
                                                    <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                                                        暂无可用班级
                                                    </div>
                                                ) : (
                                                    allClasses.map(classItem => (
                                                        <div 
                                                            key={classItem.id}
                                                            style={{
                                                                padding: '12px',
                                                                borderBottom: '1px solid #f0f0f0',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                backgroundColor: classItem.id === (viewingHomework.coursePlanId || '') ? '#f6ffed' : '#fff'
                                                            }}
                                                        >
                                                            <div>
                                                                <div style={{ 
                                                                    fontWeight: 600, 
                                                                    fontSize: '14px',
                                                                    color: classItem.id === (viewingHomework.coursePlanId || '') ? '#52c41a' : '#333'
                                                                }}>
                                                                    {classItem.name}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                                                    学生人数: {classItem.students?.length || 0} 人
                                                                </div>
                                                            </div>
                                                            {classItem.id === (viewingHomework.coursePlanId || '') && (
                                                                <Tag color="green">当前班级</Tag>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* 创建时间 */}
                                        <div style={{ 
                                            padding: '8px 12px', 
                                            backgroundColor: '#fff', 
                                            borderRadius: '4px',
                                            border: '1px solid #d9d9d9',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                                📅 创建时间：
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>
                                                {viewingHomework.createdAt ? dayjs(viewingHomework.createdAt).format('YYYY-MM-DD HH:mm:ss') : '未知'}
                                            </div>
                                        </div>
                                        
                                        {/* 未发布说明 */}
                                        <div style={{ 
                                            padding: '8px 12px', 
                                            backgroundColor: '#fff2f0', 
                                            borderRadius: '4px',
                                            border: '1px solid #ffccc7'
                                        }}>
                                            <div style={{ fontSize: '12px', color: '#ff4d4f' }}>
                                                ⏸️ 该作业尚未发布，学生无法查看
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                                请点击"发布"按钮将作业发布给目标班级的学生
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 作业附件 */}
                        {viewingHomework.attachments && viewingHomework.attachments.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <Typography.Title level={5} style={{ marginBottom: '12px', color: '#1890ff' }}>
                                    📎 作业附件 ({viewingHomework.attachments.length})
                                </Typography.Title>
                                <div style={{ 
                                    padding: '16px', 
                                    backgroundColor: '#fff7e6', 
                                    borderRadius: '8px',
                                    border: '1px solid #ffd591'
                                }}>
                                    {viewingHomework.attachments.map((attachment, index) => (
                                        <div key={index} style={{ 
                                            padding: '12px', 
                                            border: '1px solid #d9d9d9', 
                                            borderRadius: '6px', 
                                            marginBottom: '8px',
                                            backgroundColor: '#fff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500, color: '#333' }}>
                                                    {attachment.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                    {attachment.fileName}
                                                </div>
                                            </div>
                                            <Space>
                                                <Button 
                                                    size="small" 
                                                    type="primary"
                                                    onClick={() => window.open(`/api/attachment/view?key=${attachment.fileKey}`, '_blank')}
                                                >
                                                    预览
                                                </Button>
                                                <Button 
                                                    size="small"
                                                    onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = `/api/attachment/view?key=${attachment.fileKey}&download=1`;
                                                        link.download = attachment.fileName;
                                                        link.click();
                                                    }}
                                                >
                                                    下载
                                                </Button>
                                            </Space>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 操作提示 */}
                        <div style={{ 
                            padding: '12px', 
                            backgroundColor: '#e6f7ff', 
                            borderRadius: '6px',
                            border: '1px solid #91d5ff'
                        }}>
                            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                                💡 提示：您可以点击"编辑"按钮修改作业内容，或点击"发布"按钮将此作业发布给学生
                            </Typography.Text>
                        </div>
                    </div>
                )}
            </Modal>
            </div>
        </>
    );
}
export default Homework;
