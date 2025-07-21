'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Input, Select, Typography, Divider, Descriptions } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses,getAllClasses, createClass, deleteClass, createCoursePlan, createHomework,  deleteCoursePlan,  createAttachment, getSubmissionsByHomeworkId, updateClassById, getHomeworksForStudent } from '@/lib/course/actions';
import { StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';

type AttachmentItemWithId = CreateAttachmentItem & {
    id?: string;
    fileName?: string;
    createdAt?: string;
    fileKey?: string;
};

const HomeWork = () => {
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

    // 搜索相关状态
    const [searchText, setSearchText] = useState('');
    const [searchType, setSearchType] = useState('name'); // name, fileName, coursePlanId, createdAt
    const [filteredmyHomeworkList, setFilteredmyHomeworkList] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false); // 是否处于搜索状态
    

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10; // 每页最多10行
    const [jumpPage, setJumpPage] = useState(''); // 跳转页面输入值

    // 学生作业数据状态
    const [homeworkData, setHomeworkData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 作业详情弹窗状态
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedHomework, setSelectedHomework] = useState<any>(null);

    // 获取学生作业数据并从数据库同步状态
    useEffect(() => {
        const fetchStudentHomeworks = async () => {
            setLoading(true);
            try {
                // 获取所有作业列表
                const result = await getHomeworksForStudent();
                if (Array.isArray(result)) {
                    // 从数据库获取学生的提交状态和评分
                    let submissionData: any = {};
                    try {
                        const submissionResponse = await fetch('/api/student/submissions');
                        if (submissionResponse.ok) {
                            const submissionResult = await submissionResponse.json();
                            if (submissionResult.success && submissionResult.data) {
                                submissionData = submissionResult.data.submissions;
                                console.log('从数据库获取的提交状态:', submissionData);
                            }
                        }
                    } catch (error) {
                        console.error('获取提交状态失败:', error);
                    }
                    
                    // 更新作业状态 - 基于数据库数据
                    const updatedHomeworks = result.map(homework => {
                        const submissionInfo = submissionData[homework.key] || {};
                        
                        return {
                            ...homework,
                            isSubmitted: submissionInfo.isSubmitted || false,
                            score: submissionInfo.score || null,
                            comment: submissionInfo.comment || null,
                            submitTime: submissionInfo.submitTime || null,
                            status: submissionInfo.status || '未提交'
                        };
                    });
                    
                    setHomeworkData(updatedHomeworks);
                    console.log('最终的作业数据:', updatedHomeworks);
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
    }, [message]);

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
            render: (text: string) => {
                if (isSearching && searchText && text) {
                    // 高亮搜索关键词
                    const parts = text.split(new RegExp(`(${searchText})`, 'gi'));
                    return (
                        <span>
                            {parts.map((part, index) => 
                                part.toLowerCase() === searchText.toLowerCase() ? (
                                    <span key={index} style={{ backgroundColor: '#fff2f0', color: '#cf1322' }}>
                                        {part}
                                    </span>
                                ) : part
                            )}
                        </span>
                    );
                }
                return text;
            },
        },
        // {
        //     title: '上课班级',
        //     dataIndex: 'className',
        //     key: 'className',
        //     width: 120,
        //     align: 'center',
        //     render: (text: string) => {
        //         if (isSearching && searchText && text) {
        //             // 高亮搜索关键词
        //             const parts = text.split(new RegExp(`(${searchText})`, 'gi'));
        //             return (
        //                 <span>
        //                     {parts.map((part, index) => 
        //                         part.toLowerCase() === searchText.toLowerCase() ? (
        //                             <span key={index} style={{ backgroundColor: '#fff2f0', color: '#cf1322' }}>
        //                                 {part}
        //                             </span>
        //                         ) : part
        //                     )}
        //                 </span>
        //             );
        //         }
        //         return text;
        //     },
        // },
        {
            title: '作业名称',
            dataIndex: 'homework',
            key: 'homework',
            width: 150,
            align: 'center',
            render: (text: string, record: any) => {
                const hasAttachments = record.attachments && record.attachments.length > 0;
                
                let content: React.ReactNode = text;
                if (isSearching && searchText && text) {
                    // 高亮搜索关键词
                    const parts = text.split(new RegExp(`(${searchText})`, 'gi'));
                    content = (
                        <span>
                            {parts.map((part, index) => 
                                part.toLowerCase() === searchText.toLowerCase() ? (
                                    <span key={index} style={{ backgroundColor: '#fff2f0', color: '#cf1322' }}>
                                        {part}
                                    </span>
                                ) : part
                            )}
                        </span>
                    );
                }
                
                return (
                    <div>
                        {content}
                        {hasAttachments && (
                            <div style={{ marginTop: '4px' }}>
                                <Tag color="blue" style={{ fontSize: '11px' }}>
                                    📎 有附件 ({record.attachments.length})
                                </Tag>
                            </div>
                        )}
                    </div>
                );
            },
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
            title: '作业分数',
            dataIndex: 'score',
            key: 'score',
            width: 100,
            align: 'center',
            render: (_: any, record: any) => {
                // 根据数据库状态显示
                if (record.score !== null && record.score !== undefined) {
                    // 有评分 - 显示具体分数
                    return (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '0 8px'
                          }}>
                           <div style={{ 
                            fontSize: '16px', 
                            fontWeight: 'bold', 
                            color: record.score ? '#1890ff' : '#999' 
                            }}>
                            {record.score || '-'} 
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
                    );
                } else if (record.isSubmitted) {
                    // 有提交但无评分 - 显示待评分
                    return (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '0 8px'
                          }}>
                           <div style={{ 
                            fontSize: '16px', 
                            fontWeight: 'bold', 
                            // color: record.score ? '#1890ff' : '#999',
                            cursor: 'default'
                            }}>
                            {record.score || '-'} 
                            </div>
                            <Tag color="orange" style={{ margin: 0 }}>
                                待评分
                            </Tag>
                        </div>
                    );
                } else {
                    // 没有提交记录 - 显示未提交
                    return (
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '0 8px'
                          }}>
                            <div style={{ 
                            fontSize: '16px', 
                            fontWeight: 'bold', 
                            // color: record.score ? '#1890ff' : '#999',
                            cursor: 'default'
                            }}>
                            {record.score || '-'} 
                            </div>
                            <Tag color="default" style={{ margin: 0 }}>
                                未提交
                            </Tag>
                        </div>
                    );
                }
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 140,
            align: 'center',
            render: (_: any, record: any) => (
                <Space size="small">
                    <a onClick={() => {
                        setSelectedHomework(record);
                        setDetailModalVisible(true);
                    }}>查看详情</a>
                    <a onClick={() => {
                        // 跳转到提交作业页面，通过URL参数传递作业信息
                        const params = new URLSearchParams({
                            key: record.key || '',
                            homework: record.homework || '',
                            courseName: record.courseName || '',
                            className: record.className || '',
                            description: record.description || '',
                            publishTime: record.publishTime || '',
                            deadline: record.deadline || '',
                            status: record.status || ''
                        });
                        router.push(`/admin_student/submit-homework?${params.toString()}`);
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

    // 初始化过滤列表
    useEffect(() => {
        if (!isSearching) {
            setFilteredmyHomeworkList(homeworkData);
        }
    }, [homeworkData, isSearching]);

    // 处理搜索
    const handleSearch = () => {
        if (!searchText.trim()) {
            message.warning('请输入搜索关键词');
            return;
        }
        const filtered = homeworkData.filter(homework => 
            homework.homework.toLowerCase().includes(searchText.toLowerCase().trim()) ||
            homework.courseName?.toLowerCase().includes(searchText.toLowerCase().trim()) ||
            homework.className?.toLowerCase().includes(searchText.toLowerCase().trim())
        );
        setFilteredmyHomeworkList(filtered);
        setIsSearching(true);
        if (filtered.length === 0) {
            message.info('未找到匹配的作业');
        } else {
            message.success(`找到 ${filtered.length} 个匹配的作业`);
        }
    };

    // 清空搜索
    const handleClearSearch = () => {
        setSearchText('');
        setFilteredmyHomeworkList(homeworkData);
        setIsSearching(false);
        message.success('已清空搜索条件');
    };

    // 获取当前显示的作业列表
    const getCurrentHomeworkList = () => {
        return isSearching ? filteredmyHomeworkList : homeworkData;
    };


    return (
        <div style={{ padding: '10px' }}>
            {/* 页面标题 */}
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: '16px' }}>我的作业</div>
            
            {/* 搜索栏区域 */}
            <div style={{
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: '#fafafa', 
                borderRadius: '8px',
                border: '1px solid #d9d9d9',
                width: '100%'
            }}>
                <Row gutter={[16, 12]} align="middle" wrap>
                    <Col xs={24} sm={18} md={14} lg={10}>
                        <Input 
                            placeholder="输入 作业名称 或 课程名称 "
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onPressEnter={handleSearch}
                            allowClear
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Col>
                    <Col xs={24} sm={6} md={6} lg={4}>
                        <Space>
                            <Button 
                                type="primary" 
                                onClick={handleSearch} 
                                disabled={!searchText.trim()}
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
                    <Col xs={24} sm={24} md={4} lg={10}>
                        {isSearching && (
                            <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                                搜索: "{searchText}" (找到 {filteredmyHomeworkList.length} 个结果)
                            </Tag>
                        )}
                    </Col>
                </Row>
            </div>
            
            <Table
                className="mb-4"
                bordered
                size="small"
                rowKey="key"
                columns={columns}
                dataSource={getCurrentHomeworkList()}
                loading={loading}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: getCurrentHomeworkList().length,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20', '50'],
                    onChange: (page, size) => {
                        setCurrentPage(page);
                    },
                    showTotal: (total) => isSearching ? `搜索结果：共 ${total} 条作业` : `共 ${total} 条作业`,
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
                                    <div>
                                        <div style={{ marginBottom: '8px' }}>
                                            {selectedHomework.description || '暂无描述'}
                                        </div>
                                        {selectedHomework.attachments && selectedHomework.attachments.length > 0 && (
                                            <div>
                                                <Divider style={{ margin: '8px 0' }}>作业附件</Divider>
                                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                    {selectedHomework.attachments.map((attachment: any, index: number) => (
                                                        <div key={index} style={{ 
                                                            padding: '8px 12px', 
                                                            border: '1px solid #d9d9d9', 
                                                            borderRadius: '6px', 
                                                            marginBottom: '8px',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            backgroundColor: '#f9f9f9'
                                                        }}>
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: '#1890ff' }}>
                                                                    📎 {attachment.name}
                                                                </div>
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
                                            </div>
                                        )}
                                    </div>
                                </Descriptions.Item>
                                <Descriptions.Item label="发布时间">
                                    {selectedHomework.publishTime ? new Date(selectedHomework.publishTime).toLocaleString() : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="截止时间">
                                    {selectedHomework.deadline ? new Date(selectedHomework.deadline).toLocaleString() : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="作业分数">
                                    {selectedHomework.score !== null && selectedHomework.score !== undefined ? (
                                        <div>
                                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                                                {selectedHomework.score} 分
                                            </span>
                                            <Tag color="green" style={{ marginLeft: 8 }}>
                                                已评分
                                            </Tag>
                                            {selectedHomework.submitTime && (
                                                <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                                                    提交时间: {new Date(selectedHomework.submitTime).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    ) : selectedHomework.isSubmitted ? (
                                        <div>
                                            <Tag color="orange">待评分</Tag>
                                            {selectedHomework.submitTime && (
                                                <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                                                    提交时间: {new Date(selectedHomework.submitTime).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Tag color="default">未提交</Tag>
                                    )}
                                </Descriptions.Item>
                                {selectedHomework.comment && (
                                    <Descriptions.Item label="评语">
                                        {selectedHomework.comment}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </div>
                    )}
                </Modal>


            </div>
        </div>
    )
}

export default HomeWork;