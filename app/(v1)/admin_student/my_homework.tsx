'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Descriptions } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses,getAllClasses, createClass, deleteClass, createCoursePlan, createHomework,  deleteCoursePlan,  createAttachment, getSubmissionsByHomeworkId, updateClassById, getHomeworksForStudent } from '@/lib/course/actions';
import { UserItem, StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';

const HomeWork = () => {
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

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10; // 每页最多10行
    const [jumpPage, setJumpPage] = useState(''); // 跳转页面输入值

    // 学生作业数据状态
    const [homeworkData, setHomeworkData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 作业详情弹窗状态
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedHomework, setSelectedHomework] = useState<any>(null);

    // 提交作业弹窗状态
    const [submitModalVisible, setSubmitModalVisible] = useState(false);
    const [submittingHomework, setSubmittingHomework] = useState<any>(null);
    const [submitForm] = Form.useForm();

    // 获取学生作业数据
    useEffect(() => {
        const fetchStudentHomeworks = async () => {
            setLoading(true);
            try {
                const result = await getHomeworksForStudent();
                if (Array.isArray(result)) {
                    setHomeworkData(result);
                } else if (result.error) {
                    message.error(result.error);
                }
            } catch (error) {
                console.error('获取学生作业失败:', error);
                message.error('获取作业数据失败');
            }
            setLoading(false);
        };

        fetchStudentHomeworks();
    }, []);

    // 定义表格数据（使用真实数据）
    const [tableData, setTableData] = useState([
        {
            key: '1',
            col1: '',
            col2: '',
            col3: '',
            col4: '',
            col5: '',
            col6: '',
            col7: '',
            col8: '',
            col9: '',
        },
        {
            key: '2',
            col1: '',
            col2: '',
            col3: '',
            col4: '',
            col5: '',
            col6: '',
            col7: '',
            col8: '',
            col9: '',
        },
        {
            key: '3',
            col1: '',
            col2: '',
            col3: '',
            col4: '',
            col5: '',
            col6: '',
            col7: '',
            col8: '',
            col9: '',
        },
        {
            key: '4',
            col1: '',
            col2: '',
            col3: '',
            col4: '',
            col5: '',
            col6: '',
            col7: '',
            col8: '',
            col9: '',
        },
    ]);

    // 增加行的函数
    const addRow = () => {
        modal.confirm({
            title: '确认操作',
            content: '确定要增加一行吗？',
            onOk() {
                const newKey = (tableData.length + 1).toString();
                const newRow = {
                    key: newKey,
                    col1: '',
                    col2: '',
                    col3: '',
                    col4: '',
                    col5: '',
                    col6: '',
                    col7: '',
                    col8: '',
                    col9: '',
                };
                setTableData([...tableData, newRow]);
                message.success('成功增加一行');
            },
            onCancel() {
                console.log('取消增加行');
            },
        });
    };

    // 减少行的函数
    const removeRow = () => {
        if (tableData.length <= 1) {
            message.warning('至少需要保留一行');
            return;
        }
        
        modal.confirm({
            title: '确认操作',
            content: '确定要删除最后一行吗？',
            onOk() {
                const newData = tableData.slice(0, -1);
                setTableData(newData);
                message.success('成功删除一行');
            },
            onCancel() {
                console.log('取消删除行');
            },
        });
    };

    // 跳转页面函数
    const handleJumpPage = () => {
        const pageNum = parseInt(jumpPage);
        const totalPages = Math.ceil(tableData.length / pageSize);
        
        if (!jumpPage || isNaN(pageNum)) {
            modal.error({
                title: '输入错误',
                content: '请输入有效的页码数字',
            });
            return;
        }
        
        if (pageNum < 1 || pageNum > totalPages) {
            modal.error({
                title: '页码不存在',
                content: `请输入 1 到 ${totalPages} 之间的页码`,
            });
            return;
        }
        
        setCurrentPage(pageNum);
        setJumpPage('');
        message.success(`已跳转到第 ${pageNum} 页`);
    };

    // 定义表格列（显示真实作业数据）
    const columns: ColumnsType<any> = [
        {
            title: '序号',
            dataIndex: 'index',
            key: 'index',
            width: 80,
            align: 'center',
            render: (_: any, _record: any, index: number) => index + 1,
        },
        {
            title: '课程名称',
            dataIndex: 'courseName',
            key: 'courseName',
            width: 150,
            align: 'center',
        },
        {
            title: '班级',
            dataIndex: 'className',
            key: 'className',
            width: 120,
            align: 'center',
        },
        {
            title: '作业名称',
            dataIndex: 'homework',
            key: 'homework',
            width: 150,
            align: 'center',
        },
        {
            title: '发布时间',
            dataIndex: 'publishTime',
            key: 'publishTime',
            width: 135,
            align: 'center',
            render: (text: string) => text ? new Date(text).toLocaleString() : '-',
        },
        {
            title: '截止时间',
            dataIndex: 'deadline',
            key: 'deadline',
            width: 135,
            align: 'center',
            render: (text: string) => text ? new Date(text).toLocaleString() : '-',
        },
        {
            title: '作业状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            align: 'center',
            render: (text: string) => (
                <Tag color={text === '已发布' ? 'green' : 'default'}>
                    {text}
                </Tag>
            ),
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            align: 'center',
            render: (_: any, record: any) => (
                <Space size="small">
                    <a onClick={() => {
                        setSelectedHomework(record);
                        setDetailModalVisible(true);
                    }}>查看详情</a>
                    <a onClick={() => {
                        setSubmittingHomework(record);
                        setSubmitModalVisible(true);
                        submitForm.resetFields();
                    }}>提交作业</a>
                </Space>
            ),
        },
    ];

    // 定义空表格数据
    const dataSource = [
        {
            key: '1',
            col1: '',
            col2: '',
            col3: '',
            col4: '',
            col5: '',
            col6: '',
            col7: '',
            col8: '',
            col9: '',
        },
        {
            key: '2',
            col1: '',
            col2: '',
            col3: '',
            col4: '',
            col5: '',
            col6: '',
            col7: '',
            col8: '',
            col9: '',
        },
    ];

    return (
        <div style={{ padding: '10px' }}>
            <Table
                className="mb-4"
                title={() => (
                    <div className="flex justify-between">
                        <p>我的作业</p>
                    </div>
                )}
                bordered
                size="small"
                rowKey="key"
                columns={columns}
                dataSource={homeworkData}
                loading={loading}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: homeworkData.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20', '50'],
                    onChange: (page, size) => {
                        setCurrentPage(page);
                    },
                    showTotal: (total) => `共 ${total} 条作业`,
                }}
            />
            <div style={{ marginTop: '10px', marginBottom: '10px', color: '#666', fontSize: '14px' }}>
                当前显示：第 {currentPage} 页表格 (每页最多 {pageSize} 行，共 {tableData.length} 行数据)
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <span style={{ marginLeft: '20px', color: '#666' }}>前往：</span>
                <Input
                    style={{ width: '80px' }}
                    placeholder="页码"
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    onPressEnter={handleJumpPage}
                />
                <span style={{ color: '#666' }}>页</span>
                <Button 
                    onClick={handleJumpPage}
                    style={{ marginLeft: '5px' }}
                >
                    跳转
                </Button>
            </div>
            <div>
                {/* 作业详情弹窗 */}
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
                                <Descriptions.Item label="课程名称">
                                    {selectedHomework.courseName}
                                </Descriptions.Item>
                                <Descriptions.Item label="班级">
                                    {selectedHomework.className}
                                </Descriptions.Item>
                                <Descriptions.Item label="作业描述">
                                    {selectedHomework.description || '暂无描述'}
                                </Descriptions.Item>
                                <Descriptions.Item label="发布时间">
                                    {selectedHomework.publishTime ? new Date(selectedHomework.publishTime).toLocaleString() : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="截止时间">
                                    {selectedHomework.deadline ? new Date(selectedHomework.deadline).toLocaleString() : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="作业状态">
                                    <Tag color={selectedHomework.status === '已发布' ? 'green' : 'default'}>
                                        {selectedHomework.status}
                                    </Tag>
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    )}
                </Modal>

                {/* 提交作业弹窗 */}
                <Modal
                    title="提交作业"
                    open={submitModalVisible}
                    onCancel={() => setSubmitModalVisible(false)}
                    footer={null}
                    width={600}
                >
                    {submittingHomework && (
                        <div>
                            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                                <p><strong>作业信息：</strong></p>
                                <p>作业名称：{submittingHomework.homework}</p>
                                <p>课程：{submittingHomework.courseName}</p>
                                <p>班级：{submittingHomework.className}</p>
                            </div>
                            
                            <Form
                                form={submitForm}
                                layout="vertical"
                                onFinish={async (values) => {
                                    try {
                                        // 创建提交的作业数据
                                        const submissionData = {
                                            key: Date.now().toString(),
                                            homework: submittingHomework.homework,
                                            description: values.content,
                                            studentName: '当前学生', // 这里应该获取当前登录学生的姓名
                                            submitTime: new Date().toISOString(),
                                            status: '未批改'
                                        };

                                        // 发送到教师端（这里使用 localStorage 模拟数据传递）
                                        const existingSubmissions = JSON.parse(localStorage.getItem('teacherSubmissions') || '[]');
                                        existingSubmissions.push(submissionData);
                                        localStorage.setItem('teacherSubmissions', JSON.stringify(existingSubmissions));

                                        message.success('作业提交成功！');
                                        setSubmitModalVisible(false);
                                        submitForm.resetFields();
                                    } catch (error) {
                                        console.error('提交作业失败:', error);
                                        message.error('提交作业失败');
                                    }
                                }}
                            >
                                <Form.Item
                                    label="作业内容"
                                    name="content"
                                    rules={[{ required: true, message: '请输入作业内容' }]}
                                >
                                    <Input.TextArea 
                                        rows={6} 
                                        placeholder="请输入您的作业内容..."
                                    />
                                </Form.Item>
                                
                                <Form.Item>
                                    <Button type="primary" htmlType="submit" block>
                                        提交作业
                                    </Button>
                                </Form.Item>
                            </Form>
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    )
}

export default HomeWork;