'use client';

import React, { useEffect, useState } from 'react';
import { Typography, Card, Spin, App, Button, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAllCourses } from '@/lib/course/actions';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

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

    // 定义表格数据（可动态增减）
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
            message.warning('请先勾选要删除的行');
            return;
        }
        
        modal.confirm({
            title: '确认操作',
            content: '确定要删除选中的行吗？',
            onOk() {
                const newData = tableData.filter(row => !selectedKeys.includes(row.key));
                setTableData(newData);
                setSelectedKeys([]); // 清空勾选行
                message.success('成功删除选中行');
            },
            onCancel() {
                console.log('取消删除行');
            },
        });
    };

    // 编辑单行数据
    const handleEdit = (row: any) => {
        setEditingRow(row);
        editForm.setFieldsValue({
            col1: row.col1,
            col2: row.col2,
            col3: row.col3,
            col4: row.col4,
            col5: row.col5,
        });
        setEditModalVisible(true);
    };

    // 提交编辑
    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();
            
            const updatedData = tableData.map(row => 
                row.key === editingRow.key 
                    ? { ...row, ...values }
                    : row
            );
            
            setTableData(updatedData);
            setEditModalVisible(false);
            setEditingRow(null);
            editForm.resetFields();
            message.success('编辑成功');
        } catch (error) {
            console.error('编辑失败:', error);
        }
    };

    // 删除单行数据
    const handleDelete = (row: any) => {
        const className = row.col1 || '未命名班级';
        modal.confirm({
            title: '确认删除',
            content: `确定要删除"${className}"的课程安排吗？`,
            okText: '确定删除',
            cancelText: '取消',
            okType: 'danger',
            onOk() {
                const newData = tableData.filter(item => item.key !== row.key);
                setTableData(newData);
                message.success('删除成功');
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
                                <Typography.Text>课程状态：{course.is_active == 1 ? '启用' : '禁用'}</Typography.Text>
                                <Typography.Text>课程创建时间：{course.created_at}</Typography.Text>
                                <Typography.Text>课程更新时间：{course.updated_at ? new Date(course.updated_at).toLocaleString() : 'Null'}</Typography.Text>
                                <Typography.Text>cover_id：{course.cover_id || 'Null'}</Typography.Text>
                            </div>
                        </div>
                    </div>
                </div>
                <Card>
                    <div style={({ fontFamily: 'SimSun, 宋体, serif'})}>
                    中文描述中文描述中文描述中文描述中文描述中文描述中文描述
                    </div>
                </Card>
                {/* Tab 按钮 */}
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
                    <button
                        style={{
                            border: 'none',
                            background: activeTab === 'other' ? '#fff' : '#f7f8fa',
                            borderBottom: activeTab === 'other' ? '2px solid #1890ff' : '2px solid transparent',
                            color: activeTab === 'other' ? '#1890ff' : '#666',
                            fontWeight: activeTab === 'other' ? 'bold' : 'normal',
                            padding: '8px 24px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                        onClick={() => setActiveTab('other')}
                    >
                        其他
                    </button>
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
                                            <td style={{ border: '1px solid #eee', padding: 8, textAlign: 'center', width: '60px' }}>{row.key}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '120px' }}>{row.col1}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '100px' }}>{row.col2}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '100px' }}>{row.col3}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '80px' }}>{row.col4}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '200px' }}>{row.col5}</td>
                                            <td style={{ border: '1px solid #eee', padding: 8, width: '120px', textAlign: 'center' }}>
                                                <Space size="small">
                                                    <Button 
                                                        type="primary" 
                                                        size="small" 
                                                        icon={<EditOutlined />}
                                                        onClick={() => handleEdit(row)}
                                                    >
                                                        编辑
                                                    </Button>
                                                    <Button 
                                                        type="primary" 
                                                        danger
                                                        size="small" 
                                                        icon={<DeleteOutlined />}
                                                        onClick={() => handleDelete(row)}
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
                    width={600}
                    okText="保存"
                    cancelText="取消"
                >
                    {editingRow && (
                        <Form form={editForm} layout="vertical">
                            <Form.Item
                                label="上课班级"
                                name="col1"
                                rules={[{ required: true, message: '请输入上课班级' }]}
                            >
                                <Input placeholder="请输入上课班级" />
                            </Form.Item>
                            <Form.Item
                                label="理论教师"
                                name="col2"
                                rules={[{ required: true, message: '请输入理论教师' }]}
                            >
                                <Input placeholder="请输入理论教师" />
                            </Form.Item>
                            <Form.Item
                                label="实验教师"
                                name="col3"
                                rules={[{ required: true, message: '请输入实验教师' }]}
                            >
                                <Input placeholder="请输入实验教师" />
                            </Form.Item>
                            <Form.Item
                                label="助教"
                                name="col4"
                                rules={[{ required: true, message: '请输入助教' }]}
                            >
                                <Input placeholder="请输入助教" />
                            </Form.Item>
                            <Form.Item
                                label="上课时间"
                                name="col5"
                                rules={[{ required: true, message: '请输入上课时间' }]}
                            >
                                <Input placeholder="请输入上课时间，如：周一 1-2节" />
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </App>
    );
};

export default CourseDetail; 