'use client';

// 作业管理页面
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Pagination, Descriptions } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses,getAllClasses, createClass, deleteClass, createCoursePlan, createHomework,  deleteCoursePlan,  createAttachment, getSubmissionsByHomeworkId, updateClassById } from '@/lib/course/actions';
import { UserItem, StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const { Option } = Select;

interface Homework {
  key: string;
  homework: string;
  description: string | null;
  studentName?: string;
  submitTime?: string;
  status?: string;
}

const Homework = () => {
    const { modal, message } = App.useApp();
    const router = useRouter();

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
    const [editingHomework, setEditingHomework] = useState(null);
    const [form] = Form.useForm();

    const [data, setData] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 作业详情弹窗状态
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedHomework, setSelectedHomework] = useState<any>(null);

    // 从localStorage读取学生提交的作业数据
    useEffect(() => {
        const loadStudentSubmissions = () => {
            try {
                const submissions = JSON.parse(localStorage.getItem('teacherSubmissions') || '[]');
                // 处理状态显示
                const processedSubmissions = submissions.map((submission: any) => ({
                    ...submission,
                    status: submission.score ? '已批改' : '未批改'
                }));
                setData(processedSubmissions);
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
        
        // 定期检查localStorage变化（因为storage事件只在其他标签页触发）
        const interval = setInterval(loadStudentSubmissions, 2000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);


    // 清除所有学生提交的作业数据
    const clearAllSubmissions = () => {
        localStorage.removeItem('teacherSubmissions');
        setData([]);
        message.success('已清除所有学生提交的作业');
    };

    // 跳转到作业批改页面
    const handleGotoGrading = (record: any) => {
        router.push(`/admin_teacher/homework-grading?homeworkId=${record.key}&homeworkName=${encodeURIComponent(record.homework)}`);
    };

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const hasSelected = selectedRowKeys.length > 0;


    const columns = [
        {
            title: <input type="checkbox"
                checked={selectedRowKeys.length === data.length && data.length > 0}
                onChange={e => {
                    if (e.target.checked) {
                        setSelectedRowKeys(data.map((_, idx) => idx));
                    } else {
                        setSelectedRowKeys([]);
                    }
                }}
            />,
            dataIndex: 'select',
            width: 50,
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
                />
            ),
        },
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
            title: '提交内容',
            dataIndex: 'description',
            width: 200,
            ellipsis: true,
            render: (text: string) => (
                <div style={{
                    maxHeight: 48,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    {text || '暂无内容'}
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
            title: '批改状态',
            dataIndex: 'status',
            width: 100,
            align: 'center' as const,
            render: (text: string) => (
                <Tag color={text === '已批改' ? 'green' : 'orange'}>
                    {text || '未批改'}
                </Tag>
            ),
        },
        {
            title: '操作',
            dataIndex: 'action',
            width: 120,
            align: 'center' as const,
            render: (_: any, record: any) => (
                <Space size="small">
                    <a onClick={() => {
                        setSelectedHomework(record);
                        setDetailModalVisible(true);
                    }}>查看详情</a>
                    <a onClick={() => handleGotoGrading(record)}>批改作业</a>
                </Space>
            ),
        },
    ];

    // 模拟学生提交作业的函数（仅用于演示）
    const simulateStudentSubmission = () => {
        const mockSubmission: Homework = {
            key: Date.now().toString(),
            homework: '示例作业',
            description: '这是学生提交的作业内容示例',
            studentName: '张三',
            submitTime: new Date().toISOString(),
            status: '未批改'
        };
        
        // 更新localStorage
        const submissions = JSON.parse(localStorage.getItem('teacherSubmissions') || '[]');
        submissions.push(mockSubmission);
        localStorage.setItem('teacherSubmissions', JSON.stringify(submissions));
        
        setData([...data, mockSubmission]);
        message.success('模拟学生提交作业成功');
    };

    return (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <div style={{ marginBottom: 16 }}>
                <h2>作业批改</h2>
                <p style={{ color: '#666', fontSize: 14 }}>
                    这里显示学生提交的作业，当学生提交作业后才会在此显示。您可以查看学生提交的作业内容并进行批改。
                </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <span style={{ color: '#666' }}>当前状态：</span>
                    <Tag color={data.length > 0 ? 'blue' : 'orange'}>
                        {data.length > 0 ? `总作业：${data.length} 份` : '暂无学生提交作业'}
                    </Tag>
                    {data.length > 0 && (
                        <>
                            <Tag color="green" style={{ marginLeft: 8 }}>
                                已批改：{data.filter(item => item.status === '已批改').length} 份
                            </Tag>
                            <Tag color="orange" style={{ marginLeft: 8 }}>
                                待批改：{data.filter(item => item.status !== '已批改').length} 份
                            </Tag>
                        </>
                    )}
                </div>
                <div>
                    <Button type='primary' danger onClick={clearAllSubmissions} disabled={selectedRowKeys.length === 0}>
                        清除所有学生提交的作业
                    </Button>
                </div>
            </div>
            <Table
                rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys,
                    onChange: onSelectChange,
                }}
                columns={columns}
                dataSource={data}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: data.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10'],
                    onChange: (page, pageSize) => {
                        setCurrentPage(page);
                        setPageSize(pageSize);
                    },
                    showTotal: (total) => `共 ${total} 条`,
                }}
                loading={loading}
                rowClassName={() => 'fixed-row'}
            />
            <Modal
                title="作业详情"
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={800}
            >
                {selectedHomework && (
                    <div>
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="作业名称">
                                {selectedHomework.homework}
                            </Descriptions.Item>
                            <Descriptions.Item label="学生姓名">
                                {selectedHomework.studentName}
                            </Descriptions.Item>
                            <Descriptions.Item label="提交内容">
                                {selectedHomework.description}
                            </Descriptions.Item>
                            <Descriptions.Item label="提交时间">
                                {selectedHomework.submitTime}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
}
export default Homework;