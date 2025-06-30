'use client';

// 作业管理页面
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Pagination } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses,getAllClasses, createClass, deleteClass, createCoursePlan, createHomework,  deleteCoursePlan,  createAttachment, getSubmissionsByHomeworkId, updateClassById, getHomeworksForTeacher, getAllCoursePlans, updateHomeworkById } from '@/lib/course/actions';
import { UserItem, StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';

const { Option } = Select;

interface Homework {
  key: string;
  homework: string;
  status: string;
  description: string | null;
  course: string;
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
    const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
    const [form] = Form.useForm();

    // 新增：浏览弹窗相关状态
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [viewHomework, setViewHomework] = useState<Homework | null>(null);

    // 新增：编辑弹窗相关状态
    const [editModalVisible, setEditModalVisible] = useState(false);

    // 新增：发布弹窗相关状态
    const [publishModalVisible, setPublishModalVisible] = useState(false);
    const [publishingHomework, setPublishingHomework] = useState<Homework | null>(null);

    const [data, setData] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [coursePlans, setCoursePlans] = useState<any[]>([]);
    const [selectedCoursePlanId, setSelectedCoursePlanId] = useState<string>();
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [pendingKeyword, setPendingKeyword] = useState<string>('');

    // 从 coursePlans 创建 courseOptions
    const courseOptions = coursePlans.map(plan => ({
        label: plan.class?.name || plan.course?.name || plan.id,
        value: plan.id,
    }));

    // 根据搜索关键词过滤数据
    const filteredData = data.filter(item => 
        item.homework?.toLowerCase().includes(searchKeyword.toLowerCase())
    );

    useEffect(() => {
        const fetchHomeworks = async () => {
            setLoading(true);
            const result = await getHomeworksForTeacher();
            if (Array.isArray(result)) {
                setData(result.map(item => ({
                    ...item,
                    course: '',
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
        fetchCoursePlans();
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
            width: 90,
            render: (_: any, _record: any, idx: number) => idx + 1,
        },
        {
            title: '作业名称',
            dataIndex: 'homework',
        },
        {
            title: '作业描述',
            dataIndex: 'description',
        },
        {
            title: '发布状态',
            dataIndex: 'status',
        },
        {
            title: '操作',
            dataIndex: 'action',
            render: (_: any, record: Homework) => (
                <>
                    <a style={{ marginRight: 8 }} onClick={() => { setViewHomework(record); setViewModalVisible(true); }}>浏览</a>
                    <a style={{ marginRight: 8 }} onClick={() => { setEditingHomework(record); setEditModalVisible(true); }}>编辑</a>
                    <a style={{ marginRight: 8 }} onClick={() => { setPublishingHomework(record); setPublishModalVisible(true); }}>
                        {record.status === '已发布' ? '取消发布' : '发布作业'}
                    </a>
                    <a style={{ color: 'red' }}>删除</a>
                </>
            ),
        },
    ];

    return (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Form
                form={form}
                layout="inline"
                className="gap-2"
                // initialValues={search}
                onFinish={Homework}
            >
                <Form.Item label="作业名称" name="key">
                    <Input
                        placeholder="请输入作业名称"
                        value={pendingKeyword}
                        onChange={(e) => setPendingKeyword(e.target.value)}
                        style={{ width: 200 }}
                        allowClear
                    />
                </Form.Item>
                <Form.Item>
                    <Button 
                        type="primary" 
                        onClick={() => {
                            setSearchKeyword(pendingKeyword);
                        }}
                    >
                        搜索
                    </Button>
                </Form.Item>
            </Form>
                <Button
                    type='primary'
                    onClick={() => {
                        setEditingHomework(null);
                        form.resetFields();
                        setIsModalVisible(true);
                    }}
                    style={{ marginBottom: 16, marginRight: 10 }}
                >
                    新增作业
                </Button>
                <Button type='primary' danger onClick={() => {}} disabled={selectedRowKeys.length === 0}>
                    批量删除
                </Button>
            </div>
            <Table
                rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys,
                    onChange: onSelectChange,
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
                    showTotal: (total) => `共 ${total} 条`,
                }}
                loading={loading}
            />
            <Modal
                title={editingHomework ? '编辑作业' : '新增作业'}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={async (values) => {
                        if (!selectedCoursePlanId) {
                            message.error('请选择课程/班级');
                            return;
                        }
                        const homeworkData = {
                            coursePlanId: selectedCoursePlanId,
                            name: values.homework,
                            description: values.description,
                            order: data.length + 1,
                            deadline: new Date(),
                        };
                        const res = await createHomework(homeworkData);
                        if (res) {
                            message.success('作业添加成功');
                            setIsModalVisible(false);
                            form.resetFields();
                            // 重新拉取作业列表
                            const result = await getHomeworksForTeacher();
                            if (Array.isArray(result)) setData(result.map(item => ({
                                ...item,
                                course: '',
                            })));
                        } else {
                            message.error('作业添加失败');
                        }
                    }}
                >
                    <Form.Item label="课程/班级" required>
                        <Select
                            value={selectedCoursePlanId}
                            onChange={setSelectedCoursePlanId}
                            placeholder="请选择课程/班级"
                        >
                            {coursePlans.map(plan => (
                                <Select.Option key={plan.id} value={plan.id}>
                                    {plan.class?.name || plan.course?.name || plan.id}
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
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            提交
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title="作业详情"
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={null}
            >
                {viewHomework && (
                    <div>
                        <p><b>作业名称：</b>{viewHomework.homework}</p>
                        <p><b>作业描述：</b>{viewHomework.description}</p>
                        <p><b>发布状态：</b>{viewHomework.status}</p>
                        {/* 如有更多字段可继续补充 */}
                    </div>
                )}
            </Modal>
            <Modal
                title="编辑作业"
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        ...editingHomework,
                        isActive: editingHomework?.status === '已发布' ? 1 : 0,
                    }}
                    onFinish={async (values) => {
                        if (!selectedCoursePlanId) {
                            message.error('请选择课程/班级');
                            return;
                        }
                        if (!editingHomework) {
                            message.error('未找到要更新的作业');
                            return;
                        }
                        
                        try {
                            const homeworkData = {
                                id: editingHomework.key,
                                coursePlanId: selectedCoursePlanId,
                                name: values.homework,
                                description: values.description,
                                order: data.length + 1,
                                deadline: new Date(),
                                isActive: values.isActive,
                            };
                            
                            const res = await updateHomeworkById(homeworkData);
                            if (res) {
                                message.success('作业更新成功');
                                setEditModalVisible(false);
                                form.resetFields();
                                
                                // 重新拉取作业列表以更新界面
                                const result = await getHomeworksForTeacher();
                                if (Array.isArray(result)) {
                                    setData(result.map(item => ({
                                        ...item,
                                        course: '',
                                    })));
                                }
                            } else {
                                message.error('作业更新失败');
                            }
                        } catch (error) {
                            console.error('更新作业失败:', error);
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
                        <Input.TextArea placeholder="请输入作业描述" />
                    </Form.Item>
                    <Form.Item
                        label="作业状态"
                        name="isActive"
                        rules={[{ required: true, message: '请选择作业状态' }]}
                    >
                        <Select placeholder="请选择作业状态">
                            <Select.Option value={1}>已发布</Select.Option>
                            <Select.Option value={0}>未发布</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            更新
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title={publishingHomework?.status === '已发布' ? '取消发布确认' : '发布作业确认'}
                open={publishModalVisible}
                onCancel={() => setPublishModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setPublishModalVisible(false)}>
                        取消
                    </Button>,
                    <Button 
                        key="publish" 
                        type="primary" 
                        onClick={async () => {
                            if (!publishingHomework) {
                                message.error('未找到要操作的作业');
                                return;
                            }
                            
                            try {
                                const isCurrentlyPublished = publishingHomework.status === '已发布';
                                const newStatus = isCurrentlyPublished ? 0 : 1;
                                
                                const homeworkData = {
                                    id: publishingHomework.key,
                                    coursePlanId: selectedCoursePlanId || '',
                                    name: publishingHomework.homework,
                                    description: publishingHomework.description || '',
                                    order: data.length + 1,
                                    deadline: new Date(),
                                    isActive: newStatus, // 切换状态
                                };
                                
                                const res = await updateHomeworkById(homeworkData);
                                if (res) {
                                    message.success(isCurrentlyPublished ? '作业已取消发布' : '作业发布成功');
                                    setPublishModalVisible(false);
                                    
                                    // 重新拉取作业列表以更新界面
                                    const result = await getHomeworksForTeacher();
                                    if (Array.isArray(result)) {
                                        setData(result.map(item => ({
                                            ...item,
                                            course: '',
                                        })));
                                    }
                                } else {
                                    message.error('操作失败');
                                }
                            } catch (error) {
                                console.error('操作失败:', error);
                                message.error('操作失败');
                            }
                        }}
                    >
                        {publishingHomework?.status === '已发布' ? '确认取消发布' : '确认发布'}
                    </Button>
                ]}
            >
                {publishingHomework && (
                    <div>
                        <p><b>作业名称：</b>{publishingHomework.homework}</p>
                        <p><b>作业描述：</b>{publishingHomework.description}</p>
                        <p><b>当前状态：</b>{publishingHomework.status}</p>
                        <p style={{ color: '#1890ff', fontWeight: 'bold' }}>
                            {publishingHomework.status === '已发布' 
                                ? '取消发布后，该作业将对学生不可见，学生无法在"我的作业"界面查看。'
                                : '发布后，该作业将对学生可见，学生可以在"我的作业"界面查看和提交。'
                            }
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
}
export default Homework;