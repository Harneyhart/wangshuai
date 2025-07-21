'use client';

import React, { useEffect, useState } from 'react';
import { Typography, Card, Spin, App, Button, Modal, Form, Input, Select, message, Space, Popconfirm, TimePicker } from 'antd';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAllCourses } from '@/lib/course/actions';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const CourseDetail = () => {
    const { modal, message } = App.useApp();
    const searchParams = useSearchParams();
    const router = useRouter();
    const courseId = searchParams.get('id');
    const [course, setCourse] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 3; // 每页最多3行
    const [jumpPage, setJumpPage] = useState(''); // 跳转页面输入值
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'arrange' | 'other'>('arrange');

    // 编辑和删除相关状态
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingRow, setEditingRow] = useState<any>(null);
    const [editForm] = Form.useForm();

    // 下拉选择数据
    const [classes, setClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);



    // 定义表格数据（从数据库动态获取）
    const [tableData, setTableData] = useState<any[]>([]);

    // 重新编号函数
    const resequenceTableData = (data: any[]) => {
        return data.map((item, index) => ({
            ...item,
            key: (index + 1).toString(),
        }));
    };

    // 增加行的函数
    const addRow = async () => {
        modal.confirm({
            title: '确认操作',
            content: '确定要增加一行吗？将为您创建一个新的课程安排记录。',
            async onOk() {
                try {
                    // 先在数据库中创建新记录，获得真实ID
                    const response = await fetch('/api/course-arrangements', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            courseId: courseId,
                            classRoom: '',
                            startTime: new Date('2024-01-01T08:00:00').toISOString(),
                            endTime: new Date('2024-01-01T10:00:00').toISOString(),
                            teacherIds: {
                                theory: null,
                                experiment: null,
                                assistant: null,
                            }
                        }),
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log('新建课程安排成功:', result);
                        
                        // 重新获取数据以确保显示最新的记录
                        await refreshCourseArrangements();
                        message.success('成功增加一行课程安排');
                    } else {
                        const errorData = await response.json();
                        console.error('创建失败:', errorData);
                        message.error(errorData.error || '创建课程安排失败');
                    }
                } catch (error) {
                    console.error('创建课程安排失败:', error);
                    message.error('创建课程安排失败');
                }
            },
            onCancel() {
                console.log('取消增加行');
            },
        });
    };

    // 减少行的函数
    const removeRow = () => {
        if (selectedKeys.length === 0) {
            message.warning('请先勾选要删除的行');
            return;
        }
        
        modal.confirm({
            title: '确认批量删除',
            content: `确定要彻底删除选中的 ${selectedKeys.length} 行课程安排吗？这是删除操作，将完全从数据库中移除，无法恢复！`,
            async onOk() {
                try {
                    // 获取选中的行数据
                    const selectedRows = tableData.filter(row => selectedKeys.includes(row.key));
                    console.log('准备批量删除的行:', selectedRows);
                    
                    // 只删除有真实数据库ID的记录
                    const deletePromises = selectedRows
                        .filter((row: any) => row.id) // 只删除有数据库ID的记录
                        .map((row: any) => {
                            console.log('删除记录ID:', row.id);
                            return fetch(`/api/course-arrangements/${courseId}?planId=${row.id}`, {
                                method: 'DELETE',
                            });
                        });

                    if (deletePromises.length > 0) {
                        console.log(`开始执行 ${deletePromises.length} 个删除操作`);
                        const responses = await Promise.all(deletePromises);
                        const failedDeletes = responses.filter(response => !response.ok);
                        
                        if (failedDeletes.length > 0) {
                            console.error(`${failedDeletes.length} 个记录删除失败`);
                            message.error(`${failedDeletes.length} 个记录删除失败`);
                            return;
                        }

                        console.log('批量删除成功，重新获取数据');
                        // 删除成功后，重新获取数据确保一致性
                        await refreshCourseArrangements();
                        setSelectedKeys([]); // 清空勾选行
                        message.success(`硬删除成功！${deletePromises.length} 条记录已从数据库中彻底移除，无法恢复`);
                    } else {
                        // 如果没有有效的数据库记录可删除
                        console.log('没有找到有效的数据库记录可删除');
                        message.warning('选中的记录中没有有效的数据库记录可删除');
                        setSelectedKeys([]); // 清空勾选行
                    }
                } catch (error) {
                    console.error('批量删除失败:', error);
                    message.error('批量删除失败');
                }
            },
            onCancel() {
                console.log('取消删除行');
            },
        });
    };

    // 编辑单行数据
    const handleEdit = (row: any) => {
        // 检查是否有真实的数据库ID
        if (!row.id) {
            message.error('该记录还未保存到数据库，无法编辑');
            return;
        }

        setEditingRow(row);

        editForm.setFieldsValue({
            col1: row.col1,        // 班级
            col2: row.col2,        // 理论教师
            col3: row.col3,        // 实验教师
            col4: row.col4,        // 助教
            col5: row.col5,        // 教室
            startTime: row.startTime ? dayjs(row.startTime) : null,  // 开始时间
            endTime: row.endTime ? dayjs(row.endTime) : null          // 结束时间
        });
        setEditModalVisible(true);
    };

    // 提交编辑
    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();

            // 检查是否有真实的数据库ID
            if (!editingRow.id) {
                message.error('该记录缺少数据库ID，无法保存');
                return;
            }

            // 获取教师ID而不是教师名称
            const getTeacherId = (teacherName: string) => {
                const teacher = teachers.find(t => t.name === teacherName);
                return teacher ? teacher.id : null;
            };

            const submitData = {
                id: editingRow.id, // 使用真实的数据库ID
                courseId: courseId,
                col1: values.col1, // 班级
                col2: values.col2, // 理论教师
                col3: values.col3, // 实验教师
                col4: values.col4, // 助教
                col5: values.col5, // 教室
                // 时间信息
                startTime: values.startTime ? values.startTime.toISOString() : null, // 开始时间
                endTime: values.endTime ? values.endTime.toISOString() : null,       // 结束时间
                // 添加教师ID信息
                teacherIds: {
                    theory: values.col2 ? getTeacherId(values.col2) : null,      // 理论教师ID
                    experiment: values.col3 ? getTeacherId(values.col3) : null,  // 实验教师ID
                    assistant: values.col4 ? getTeacherId(values.col4) : null,   // 助教ID
                }
            };

            console.log('提交编辑数据:', submitData);
            console.log('编辑行信息:', editingRow);
            console.log('教师ID映射:', submitData.teacherIds);
            
            // 同步到数据库
            const response = await fetch('/api/course-arrangements', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData),
            });

            console.log('编辑响应状态:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('编辑成功响应:', result);
                
                // 编辑成功后，重新获取数据确保一致性
                await refreshCourseArrangements();
                setEditModalVisible(false);
                setEditingRow(null);
                editForm.resetFields();
                message.success('课程安排保存成功！班级、教师、教室、时间信息已同步到数据库');
            } else {
                const errorData = await response.json();
                console.error('编辑失败:', errorData);
                message.error(errorData.error || '保存失败');
            }
        } catch (error) {
            console.error('编辑失败:', error);
            message.error('编辑失败');
        }
    };

    // 重新获取课程安排数据的函数
    const refreshCourseArrangements = async () => {
        if (!courseId) return;
        
        console.log('开始刷新课程安排数据, courseId:', courseId);
        
        try {
            const response = await fetch(`/api/course-arrangements/${courseId}`);
            console.log('刷新数据响应状态:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('刷新数据响应结果:', result);
                
                if (result.success && result.data) {
                    // 保留数据库ID，只为显示序号添加额外字段
                    const arrangementsWithSequence = result.data.map((item: any, index: number) => ({
                        ...item,
                        key: item.id, // 保持key为数据库ID
                        displayIndex: index + 1, // 添加显示序号字段
                    }));
                    console.log('处理后的数据:', arrangementsWithSequence);
                    setTableData(arrangementsWithSequence);
                    console.log('刷新课程安排数据成功, 共', arrangementsWithSequence.length, '条记录');
                } else {
                    // 如果没有数据，设置为空数组
                    console.log('没有找到课程安排数据，设置为空数组');
                    setTableData([]);
                }
            } else {
                console.error('获取课程安排数据失败, 状态码:', response.status);
                const errorData = await response.json();
                console.error('错误详情:', errorData);
                setTableData([]);
            }
        } catch (error) {
            console.error('获取课程安排数据失败:', error);
            setTableData([]);
        }
    };

    // 删除单行数据
    const handleDelete = async (row: any): Promise<void> => {
        const className = row.col1 || '未命名班级';
        console.log('准备删除记录:', {
            key: row.key,
            id: row.id,
            className: className,
            courseId: courseId
        });

        // 检查是否有真实的数据库ID
        if (!row.id) {
            message.error('该记录还未保存到数据库，无法删除');
            return;
        }
        
        modal.confirm({
            title: '确认硬删除',
            content: `确定要彻底删除"${className}"的课程安排吗？这是硬删除操作，将完全从数据库中移除，无法恢复！`,
            okText: '确认硬删除',
            cancelText: '取消',
            okType: 'danger',
            async onOk() {
                try {
                    const deleteUrl = `/api/course-arrangements/${courseId}?planId=${row.id}`;
                    console.log('发送删除请求:', deleteUrl);
                    
                    const response = await fetch(deleteUrl, {
                        method: 'DELETE',
                    });

                    console.log('删除响应状态:', response.status);
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('删除失败:', errorData);
                        message.error(errorData.error || '删除数据库记录失败');
                        return;
                    }

                    const responseData = await response.json();
                    console.log('删除成功响应:', responseData);
                    
                    // 删除成功后，重新获取数据确保一致性
                    console.log('重新获取数据...');
                    await refreshCourseArrangements();
                    message.success('硬删除成功！记录已从数据库中彻底移除，无法恢复');
                } catch (error) {
                    console.error('删除失败:', error);
                    message.error('删除失败');
                }
            },
            onCancel() {
                console.log('取消删除');
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
    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const courses = await getAllCourses();
                console.log('Fetched courses:', courses);
                const currentCourse = courses.find(c => c.id === courseId);
                console.log('Current course:', currentCourse);
                setCourse(currentCourse);
            } catch (error) {
                console.error('获取课程信息失败:', error);
            } finally {
                setLoading(false);
            }
        };

        if (courseId) {
            fetchCourse();
        }
    }, [courseId]);

    // 获取班级和教师数据
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [classesRes, teachersRes] = await Promise.all([
                    fetch('/api/classes/active'),
                    fetch('/api/teachers/list')
                ]);

                if (classesRes.ok) {
                    const classesData = await classesRes.json();
                    if (classesData.success) {
                        setClasses(classesData.data);
                    }
                }

                if (teachersRes.ok) {
                    const teachersData = await teachersRes.json();
                    if (teachersData.success) {
                        setTeachers(teachersData.data);
                    }
                }
            } catch (error) {
                console.error('获取下拉数据失败:', error);
            }
        };

        fetchData();
    }, []);

    // 获取课程安排数据
    useEffect(() => {
        const fetchCourseArrangements = async () => {
            if (!courseId) return;
            
            try {
                const response = await fetch(`/api/course-arrangements/${courseId}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        // 保留数据库ID，只为显示序号添加额外字段
                                            const arrangementsWithSequence = result.data.map((item: any, index: number) => ({
                        ...item,
                        key: item.id, // 保持key为真实的数据库ID
                    }));
                        setTableData(arrangementsWithSequence);
                        console.log('获取课程安排数据成功:', arrangementsWithSequence);
                    } else {
                        // 如果没有数据，设置为空数组而不是保持默认行
                        console.log('没有找到课程安排数据，设置为空数组');
                        setTableData([]);
                    }
                } else {
                    console.error('获取课程安排数据失败');
                    setTableData([]);
                }
            } catch (error) {
                console.error('获取课程安排数据失败:', error);
                setTableData([]);
            }
        };

        fetchCourseArrangements();
    }, [courseId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!course) {
        return (
            <div style={{ padding: '20px' }}>
                <Typography.Text type="danger">未找到课程信息</Typography.Text>
            </div>
        );
    }

    // 修改课程状态
    const handleChangeCourseStatus = async () => {
        if (!course) {
            message.error('课程信息不存在');
            return;
        }

        const newStatus = course.isActive === 1 ? 0 : 1;
        const statusText = newStatus === 1 ? '启用' : '禁用';
        
        modal.confirm({
            title: '确认修改',
            content: `确定要${statusText}这门课程吗？`,
            okText: `确定${statusText}`,
            cancelText: '取消',
            async onOk() {
                try {
                    const response = await fetch(`/api/courses/${courseId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ isActive: newStatus }),
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('课程状态修改成功:', result);
                        
                        // 更新本地课程状态
                        if (course) {
                            setCourse({ ...course, isActive: newStatus, updatedAt: new Date().toISOString() });
                        }
                        
                        message.success(`课程${statusText}成功`);
                    } else {
                        const errorData = await response.json();
                        console.error('修改失败:', errorData);
                        message.error(errorData.error || '修改课程状态失败');
                    }
                } catch (error) {
                    console.error('修改课程状态失败:', error);
                    message.error('修改课程状态失败');
                }
            }
        });
    };

    return (
        <App>
            <div style={{ padding: '20px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '20px',
                    position: 'relative'  // 添加相对定位
                }}>
                    <Button 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => router.back()}
                        style={{ 
                            position: 'absolute',  // 使用绝对定位
                            right: '40px',         // 向左偏移
                            top: '50%',            // 垂直居中
                            transform: 'translateY(-50%)'  // 确保完全居中
                        }}
                    >
                        返回
                    </Button>
                    <Typography.Title level={2} style={{ margin: 0, width: '80%', textAlign: 'left' }}>课程详情</Typography.Title>
                </div>
                <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <div style ={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                                课程基本信息
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                <Typography.Text>课程名称：{course.name || 'Null'}</Typography.Text> 
                                <Typography.Text>课程描述：{course.description || 'Null'}</Typography.Text>
                                <Typography.Text>课程状态：{course.isActive == 1 ? '启用' : '禁用'}</Typography.Text>
                                <Typography.Text>课程创建时间：{course.createdAt ? new Date(course.createdAt).toLocaleString() : 'Null'}</Typography.Text>
                                <Typography.Text>课程更新时间：{course.updatedAt ? new Date(course.updatedAt).toLocaleString() : 'Null'}</Typography.Text>
                            </div>
                        </div>
                    </div>
                </div>
                <Card>
                    <div style={({ fontFamily: 'SimSun, 宋体, serif'})}>
                    中文描述中文描述中文描述中文描述中文描述中文描述中文描述
                    </div>
                </Card>
                <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginTop: 24 }}>
                    <button
                        style={{
                            border: 'none',
                            background: activeTab === 'arrange' ? '#fff' : '#f7f8fa',
                            borderBottom: activeTab === 'arrange' ? '2px solid #1890ff' : '2px solid transparent',
                            color: activeTab === 'arrange' ? '#1890ff' : '#666',
                            fontWeight: activeTab === 'arrange' ? 'bold' : 'normal',
                            padding: '8px 24px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                        onClick={() => setActiveTab('arrange')}
                    >
                        课程安排
                    </button>
                    <Button 
                        icon={<EditOutlined />} 
                        onClick={handleChangeCourseStatus}
                        type={course?.isActive === 1 ? "default" : "default"}
                        style={{ 
                            marginLeft: '930px'
                        }}
                    >
                        {course?.isActive === 1 ? '禁用课程' : '启用课程'}
                    </Button>
                </div>

                {/* Tab 内容 */}
                {activeTab === 'arrange' && (
                    <>
                        <div style={{ margin: '12px 0' }}>
                            <Button type="primary" onClick={addRow} style={{ marginRight: 8 }}>新增排课</Button>
                            <Button danger onClick={removeRow}>删除选中</Button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '50px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedKeys.length === tableData.length && tableData.length > 0}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedKeys(tableData.map(row => row.key));
                                                } else {
                                                    setSelectedKeys([]);
                                                }
                                            }}
                                        />
                                    </th>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '60px' }}>序号</th>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '120px' }}>上课班级</th>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '100px' }}>理论教师</th>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '100px' }}>实验教师</th>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '80px' }}>助教</th>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '100px' }}>教室</th>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '200px' }}>上课时间</th>
                                    <th style={{ border: '1px solid #eee', padding: 8, width: '120px' }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData
                                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                    .map((row, idx) => (
                                        <tr key={row.key}>
                                            <td style={{ border: '1px solid #eee', padding: 8, textAlign: 'center', width: '50px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedKeys.includes(row.key)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setSelectedKeys([...selectedKeys, row.key]);
                                                        } else {
                                                            setSelectedKeys(selectedKeys.filter(k => k !== row.key));
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td style={{ border: '1px solid #eee', padding: 8, textAlign: 'center', width: '60px' }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '120px' }}>{row.col1}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '100px' }}>{row.col2}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '100px' }}>{row.col3}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '80px' }}>{row.col4}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '100px' }}>{row.col5}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '200px' }}>
                                                {row.startTime && row.endTime ? 
                                                    `${dayjs(row.startTime).format('HH:mm')} - ${dayjs(row.endTime).format('HH:mm')}` : 
                                                    '未设置时间'
                                                }
                                            </td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '120px', textAlign: 'center' }}>
                                                <Space size="small">
                                                    <Button 
                                                        type="primary" 
                                                        size="small" 
                                                        icon={<EditOutlined />}
                                                        onClick={() => handleEdit(row)}
                                                        disabled={!(row as any).id}
                                                        title={!(row as any).id ? '该记录还未保存到数据库，无法编辑' : '编辑该记录'}
                                                    >
                                                        编辑
                                                    </Button>
                                                    <Button 
                                                        type="primary" 
                                                        danger
                                                        size="small" 
                                                        icon={<DeleteOutlined />}
                                                        onClick={() => handleDelete(row)}
                                                        disabled={!(row as any).id}
                                                        title={!(row as any).id ? '该记录还未保存到数据库，无法删除' : '删除该记录'}
                                                    >
                                                        删除
                                                    </Button>
                                                </Space>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center' }}>
                            <span>共 {tableData.length} 条</span>
                            <span style={{ marginLeft: 16 }}>
                                {pageSize} 条/页
                            </span>
                            <Button
                                size="small"
                                style={{ marginLeft: 16 }}
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >{'<'}</Button>
                            <span style={{ margin: '0 8px' }}>{currentPage}</span>
                            <Button
                                size="small"
                                disabled={currentPage === Math.ceil(tableData.length / pageSize)}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >{'>'}</Button>
                            <Button size="small" onClick={handleJumpPage}>前往</Button>
                            <input
                                type="number"
                                min={1}
                                max={Math.ceil(tableData.length / pageSize)}
                                value={jumpPage}
                                onChange={e => setJumpPage(e.target.value)}
                                style={{ width: 50, margin: '0 8px' }}
                            />
                            <span style={{ marginLeft: 16}}>页</span>
                        </div>  
                    </>
                )}
                {activeTab === 'other' && (
                    <div style={{ padding: 24, color: '#aaa' }}>暂无内容</div>
                )}

                {/* 编辑弹窗 */}
                <Modal
                    title={`编辑课程安排 - ${editingRow?.col1 || '未命名班级'}`}
                    open={editModalVisible}
                    onOk={handleEditSubmit}
                    onCancel={() => {
                        setEditModalVisible(false);
                        setEditingRow(null);
                        editForm.resetFields();
                    }}
                    width={700}
                    okText="保存"
                    cancelText="取消"
                >
                    {editingRow && (
                        <Form form={editForm} layout="vertical">
                            <Form.Item
                                label="上课班级"
                                name="col1"
                                rules={[{ required: true, message: '请选择上课班级' }]}
                            >
                                <Select placeholder="请选择上课班级" showSearch optionFilterProp="children">
                                    {classes.map(cls => (
                                        <Option key={cls.id} value={cls.name}>{cls.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label="理论教师"
                                name="col2"
                                rules={[{  message: '请选择理论教师' }]}
                            >
                                <Select placeholder="请选择理论教师" showSearch optionFilterProp="children">
                                    {teachers.map(teacher => (
                                        <Option key={teacher.id} value={teacher.name}>{teacher.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label="实验教师"
                                name="col3"
                            >
                                <Select placeholder="请选择实验教师（可选）" showSearch optionFilterProp="children" allowClear>
                                    {teachers.map(teacher => (
                                        <Option key={teacher.id} value={teacher.name}>{teacher.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label="助教"
                                name="col4"
                            >
                                <Select placeholder="请选择助教（可选）" showSearch optionFilterProp="children" allowClear>
                                    {teachers.map(teacher => (
                                        <Option key={teacher.id} value={teacher.name}>{teacher.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label="教室"
                                name="col5"
                            >
                                <Input placeholder="请输入教室（如：A101、实验楼B305等）" />
                            </Form.Item>
                            {/* 时间选择器 */}
                            <div style={{ display: 'flex', gap: 16 }}>
                                <Form.Item
                                    label="开始时间"
                                    name="startTime"
                                    style={{ flex: 1 }}
                                    rules={[{ required: true, message: '请选择开始时间' }]}
                                >
                                    <TimePicker 
                                        format="HH:mm" 
                                        placeholder="选择开始时间"
                                        minuteStep={5}
                                        showNow={false}
                                    />
                                </Form.Item>
                                <Form.Item
                                    label="结束时间"
                                    name="endTime"
                                    style={{ flex: 1 }}
                                    rules={[{ required: true, message: '请选择结束时间' }]}
                                >
                                    <TimePicker 
                                        format="HH:mm" 
                                        placeholder="选择结束时间"
                                        minuteStep={5}
                                        showNow={false}
                                    />
                                </Form.Item>
                            </div>
                        </Form>
                    )}
                </Modal>
            </div>
        </App>
    );
};

export default CourseDetail; 