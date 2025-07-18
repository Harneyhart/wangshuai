'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Descriptions } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses,getAllClasses, createClass, deleteClass, createCoursePlan, createHomework,  deleteCoursePlan,  createAttachment, getSubmissionsByHomeworkId, updateClassById, getClassesForStudent } from '@/lib/course/actions';
import { StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';

const Classlist = () => {
    const { modal, message } = App.useApp();

    // 学生课程数据状态
    const [classData, setClassData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 课程详情弹窗状态
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedClass, setSelectedClass] = useState<any>(null);

    // 加载教学课件数据
    const [courseAttachments, setCourseAttachments] = useState<any[]>([]);
    const [courseAttachmentsLoading, setCourseAttachmentsLoading] = useState(false);

    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 获取文件类型图标
    const getFileIcon = (fileName: string): string => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf': return '📄';
            case 'doc':
            case 'docx': return '📝';
            case 'ppt':
            case 'pptx': return '📊';
            case 'xls':
            case 'xlsx': return '📈';
            case 'mp4':
            case 'avi':
            case 'mov':
            case 'wmv': return '🎥';
            case 'mp3':
            case 'wav':
            case 'aac': return '🎵';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif': return '🖼️';
            case 'zip':
            case 'rar':
            case '7z': return '📦';
            default: return '📎';
        }
    };

    // 判断是否为视频文件
    const isVideoFile = (fileName: string): boolean => {
        const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
        const extension = fileName.split('.').pop()?.toLowerCase();
        return videoExtensions.includes(extension || '');
    };

    // 判断是否为图片文件
    const isImageFile = (fileName: string): boolean => {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const extension = fileName.split('.').pop()?.toLowerCase();
        return imageExtensions.includes(extension || '');
    };

    // 判断是否为PDF文件
    const isPdfFile = (fileName: string): boolean => {
        return fileName.toLowerCase().endsWith('.pdf');
    };

    const fetchCourseAttachments = async (courseId: string) => {
        if (!courseId) {
            setCourseAttachments([]);
            return;
        }

        setCourseAttachmentsLoading(true);
        try {
            const response = await fetch(`/api/course/attachments?courseId=${courseId}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setCourseAttachments(result.data);
                } else {
                    setCourseAttachments([]);
                }
            } else {
                setCourseAttachments([]);
            }
        } catch (error) {
            console.error('获取课程课件失败:', error);
            setCourseAttachments([]);
        } finally {
            setCourseAttachmentsLoading(false);
        }
    };


    // 获取学生课程数据
    useEffect(() => {
        const fetchStudentCourses = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/student/courses');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        const courses = result.data.courses;
                        console.log('从数据库获取的课程数据：', courses);
                        
                        // 将课程数据转换为表格需要的格式
                        const formattedData = courses.map((course: any, index: number) => ({
                            key: course.id,
                            className: course.className,
                            courseName: course.name,
                            courseDescription: course.description,
                            teacherNames: course.teacherNames,
                            location: course.location,
                            homeworkCount: course.homeworks?.length || 0,
                            createTime: course.createdAt,
                            course: course,
                        }));
                        
                        setClassData(formattedData);
                    } else {
                        console.error('API返回数据格式错误:', result);
                        setClassData([]);
                    }
                } else {
                    const errorData = await response.json();
                    console.error('获取课程失败:', errorData);
                    message.error(errorData.error || '获取课程数据失败');
                    setClassData([]);
                }
            } catch (error) {
                console.error('获取学生课程失败:', error);
                message.error('获取课程数据失败');
                setClassData([]);
            }
            setLoading(false);
        };
        fetchStudentCourses();
    }, []);

    // 定义表格列
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
            width: 180,
            align: 'center',
        },
        {
            title: '任课教师',
            dataIndex: 'teacherNames',
            key: 'teacherNames',
            width: 150,
            align: 'center',
            ellipsis: true,
            render: (text: string) => text || '暂无教师',
        },
        {
            title: '上课地点',
            dataIndex: 'location',
            key: 'location',
            width: 120,
            align: 'center',
            ellipsis: true,
            render: (text: string) => text || '暂无地点',
        },
        {
            title: '课程描述',
            dataIndex: 'courseDescription',
            key: 'courseDescription',
            width: 200,
            align: 'center',
            ellipsis: true,
            render: (text: string) => text || '暂无描述',
        },
        {
            title: '作业数量',
            dataIndex: 'homeworkCount',
            key: 'homeworkCount',
            width: 100,
            align: 'center',
            render: (count: number) => (
                <Tag color={count > 0 ? 'blue' : 'default'}>
                    {count} 个
                </Tag>
            ),
        },
        {
            title: '上课时间',
            dataIndex: 'createTime',
            key: 'createTime',
            width: 150,
            align: 'center',
            render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            align: 'center',
            render: (_: any, record: any) => (
                <Space size="small">
                    <a onClick={async () => {
                        setSelectedClass(record);
                        setDetailModalVisible(true);
                        // 获取课程课件数据
                        await fetchCourseAttachments(record.course?.id);
                    }}>查看详情</a>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, right: '100px' }}>
            <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>我的课程</div>
            </div>
            
            <Table
                columns={columns}
                dataSource={classData}
                loading={loading}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: classData.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20', '50'],
                    onChange: (page, size) => {
                        setCurrentPage(page);
                        if (size) setPageSize(size);
                    },
                    showTotal: (total) => `共 ${total} 门课程`,
                }}
                rowKey="key"
            />

            {/* 课程详情弹窗 */}
            <Modal
                title="课程详情"
                open={detailModalVisible}
                onCancel={() => {
                    setDetailModalVisible(false);
                    setCourseAttachments([]);
                    setCourseAttachmentsLoading(false);
                }}
                footer={null}
                width={800} 
            >
                {selectedClass && (
                    <div>
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="课程名称">
                                {selectedClass.courseName}
                            </Descriptions.Item>
                            <Descriptions.Item label="上课时间">
                                {selectedClass.createTime ? dayjs(selectedClass.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                        {/* 课程课件 */}
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ 
                                fontWeight: 'bold', 
                                marginBottom: '12px', 
                                color: '#1890ff',
                                fontSize: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                📚 课程课件
                                {courseAttachmentsLoading && <span style={{ fontSize: '12px', color: '#666' }}>(加载中...)</span>}
                            </div>
                            
                            {courseAttachmentsLoading ? (
                                <div style={{ 
                                    padding: '20px', 
                                    textAlign: 'center', 
                                    color: '#666',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '6px'
                                }}>
                                    正在加载课件...
                                </div>
                            ) : courseAttachments.length > 0 ? (
                                <div style={{ 
                                    maxHeight: '400px', 
                                    overflowY: 'auto',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: '6px',
                                    padding: '12px'
                                }}>
                                    {courseAttachments.map((attachment: any, index: number) => {
                                        const fileName = attachment.name || `课件${index + 1}`;
                                        const fileUrl = attachment.url || `/api/attachment/view?key=${attachment.fileKey}`;
                                        
                                        return (
                                            <div 
                                                key={attachment.id || index}
                                                style={{ 
                                                    padding: '12px', 
                                                    border: '1px solid #e9ecef', 
                                                    borderRadius: '6px', 
                                                    marginBottom: '8px',
                                                    backgroundColor: '#f8f9fa'
                                                }}
                                            >
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'flex-start',
                                                    marginBottom: '8px'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '8px',
                                                            marginBottom: '4px'
                                                        }}>
                                                            <span style={{ fontSize: '16px' }}>{getFileIcon(fileName)}</span>
                                                            <a 
                                                                href={fileUrl} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                style={{ 
                                                                    color: '#1890ff', 
                                                                    textDecoration: 'none',
                                                                    fontWeight: '500'
                                                                }}
                                                            >
                                                                {fileName}
                                                            </a>
                        </div>
                                                        <div style={{ 
                                                            fontSize: '12px', 
                                                            color: '#666',
                                                            marginLeft: '24px'
                                                        }}>
                                                            📅 上传时间: {attachment.createdAt ? dayjs(attachment.createdAt).format('YYYY-MM-DD HH:mm') : '未知'}
                                                            {attachment.fileSize && (
                                                                <span style={{ marginLeft: '12px' }}>
                                                                    📏 大小: {formatFileSize(attachment.fileSize)}
                                                                </span>
                                                            )}
                                                            {attachment.uploaderName && (
                                                                <span style={{ marginLeft: '12px' }}>
                                                                    👤 上传者: {attachment.uploaderName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ marginLeft: '12px' }}>
                                                        <Button 
                                                            type="link" 
                                                            size="small"
                                                            onClick={() => {
                                                                if (isVideoFile(fileName)) {
                                                                    Modal.info({
                                                                        title: `视频预览 - ${fileName}`,
                                                                        width: '80%',
                                                                        content: (
                                                                            <video 
                                                                                controls 
                                                                                style={{ width: '100%', maxHeight: '60vh' }}
                                                                                src={fileUrl}
                                                                            >
                                                                                您的浏览器不支持视频播放
                                                                            </video>
                                                                        ),
                                                                        okText: '关闭'
                                                                    });
                                                                } else if (isPdfFile(fileName)) {
                                                                    Modal.info({
                                                                        title: `PDF预览 - ${fileName}`,
                                                                        width: '90%',
                                                                        content: (
                                                                            <iframe
                                                                                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '70vh',
                                                                                    border: 'none',
                                                                                    borderRadius: '8px'
                                                                                }}
                                                                                title={fileName}
                                                                            />
                                                                        ),
                                                                        okText: '关闭'
                                                                    });
                                                                } else if (isImageFile(fileName)) {
                                                                    Modal.info({
                                                                        title: `图片预览 - ${fileName}`,
                                                                        width: '60%',
                                                                        content: (
                                                                            <img 
                                                                                src={fileUrl} 
                                                                                alt={fileName}
                                                                                style={{ 
                                                                                    width: '100%', 
                                                                                    maxHeight: '60vh',
                                                                                    objectFit: 'contain'
                                                                                }}
                                                                            />
                                                                        ),
                                                                        okText: '关闭'
                                                                    });
                                                                }
                                                            }}
                                                            disabled={!isVideoFile(fileName) && !isPdfFile(fileName) && !isImageFile(fileName)}
                                                        >
                                                            {isVideoFile(fileName) ? '🎥 播放' : 
                                                             isPdfFile(fileName) ? '📄 预览' : 
                                                             isImageFile(fileName) ? '🖼️ 预览' : '📥 下载'}
                                                        </Button>
                                            </div>
                                            </div>
                                            </div>
                                        );
                                    })}
                                        </div>
                            ) : (
                                <div style={{ 
                                    padding: '20px', 
                                    textAlign: 'center', 
                                    color: '#999',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '6px',
                                    border: '1px dashed #d9d9d9'
                                }}>
                                    📭 暂无课件
                                </div>
                            )}
                            </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Classlist;
