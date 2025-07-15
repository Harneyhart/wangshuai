'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Descriptions } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses,getAllClasses, createClass, deleteClass, createCoursePlan, createHomework,  deleteCoursePlan,  createAttachment, getSubmissionsByHomeworkId, updateClassById, getClassesForStudent } from '@/lib/course/actions';
import { UserItem, StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, } from '@/lib/course/actions';
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
                    <a onClick={() => {
                        setSelectedClass(record);
                        setDetailModalVisible(true);
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
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={800} 
            >
                {selectedClass && (
                    <div>
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="课程名称">
                                {selectedClass.courseName}
                            </Descriptions.Item>
                            <Descriptions.Item label="任课教师">
                                {selectedClass.teacherNames || '暂无教师'}
                            </Descriptions.Item>
                            <Descriptions.Item label="上课地点">
                                {selectedClass.location || '暂无地点'}
                            </Descriptions.Item>
                            <Descriptions.Item label="课程描述">
                                {selectedClass.courseDescription || '暂无描述'}
                            </Descriptions.Item>
                            <Descriptions.Item label="作业数量">
                                {selectedClass.homeworkCount} 个
                            </Descriptions.Item>
                            <Descriptions.Item label="上课时间">
                                {selectedClass.createTime ? dayjs(selectedClass.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                        
                        {/* {selectedClass.course?.homeworks && selectedClass.course.homeworks.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <Divider orientation="left">作业列表</Divider>
                                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                                    {selectedClass.course.homeworks.map((homework: any, index: number) => (
                                        <div key={homework.id} style={{ 
                                            padding: 12, 
                                            border: '1px solid #f0f0f0', 
                                            borderRadius: 6, 
                                            marginBottom: 8,
                                            backgroundColor: '#fafafa'
                                        }}>
                                            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                                                {index + 1}. {homework.name}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                                                {homework.description || '暂无描述'}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#999' }}>
                                                截止时间: {homework.deadline ? dayjs(homework.deadline).format('YYYY-MM-DD HH:mm') : '无限制'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )} */}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Classlist;
