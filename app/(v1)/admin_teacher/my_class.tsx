'use client';

// 我的课程界面
import React from 'react';
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Card } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses, getAllClasses, createClass, deleteClass, createCoursePlan, createHomework, deleteCoursePlan, createAttachment, getSubmissionsByHomeworkId, updateClassById, createCourse, deleteCourse, deleteAttachment, getCoursesForCurrentTeacher } from '@/lib/course/actions';
import { StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, CreateCourseItem } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';

type AttachmentItemWithId = CreateAttachmentItem & {
    id?: string;
    fileName?: string;
    createdAt?: string;
    fileKey?: string;
};

const MyClass = () => {
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

    // 搜索相关状态
    const [searchText, setSearchText] = useState('');
    const [searchType, setSearchType] = useState('name'); // name, fileName, coursePlanId, createdAt
    const [filteredCourseList, setFilteredCourseList] = useState<CoursesWithPlan[]>([]);
    const [isSearching, setIsSearching] = useState(false); // 是否处于搜索状态

    // 新增课程相关状态
    const [modalAddCourse, setModalAddCourse] = useState(false);
    const [modalDeleteCourse, setModalDeleteCourse] = useState(false);
    const [courseList, setCourseList] = useState<CoursesWithPlan[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [addCourseForm, setAddCourseForm] = useState<CreateCourseItem>({  // 添加课程表单
        name: '',
        description: '',
    });

    // 获取我的课程列表
    const getMyCourseList = async () => {
        try {
            const coursesData = await getCoursesForCurrentTeacher();
            if (Array.isArray(coursesData)) {
                setCourseList(coursesData as CoursesWithPlan[]);
            } else if (coursesData.error) {
                message.error(coursesData.error);
            }
        } catch (error) {
            console.error('获取课程列表失败:', error);
            message.error('获取课程列表失败: ' + (error instanceof Error ? error.message : '未知错误'));
        }
    };

    // 组件加载时获取课程列表
    useEffect(() => {
        getMyCourseList();
    }, []);

    // 初始化过滤列表
    useEffect(() => {
        if (!isSearching) {
            setFilteredCourseList(courseList);
        }
    }, [courseList, isSearching]);

    // 处理搜索
    const handleSearch = () => {
        if (!searchText.trim()) {
            message.warning('请输入搜索关键词');
            return;
        }
        
        const filtered = courseList.filter(course => 
            course.name.toLowerCase().includes(searchText.toLowerCase().trim())
        );
        
        setFilteredCourseList(filtered);
        setIsSearching(true);

        if (filtered.length === 0) {
            message.info('未找到匹配的课程');
        } else {
            message.success(`找到 ${filtered.length} 个匹配的课程`);
        }
    };

    // 获取当前显示的课程列表
    const getCurrentCourseList = () => {
        return isSearching ? filteredCourseList : courseList;
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>我的课程</div>
            
            {/* 操作按钮区域 */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', marginLeft: '800px' }}>
            </div>
            {/* 课程列表显示区域 */}
            <div style={{ marginBottom: '20px' }}>
                <h3>
                    课程列表 ({getCurrentCourseList().length})
                    {isSearching && (
                        <span style={{ color: '#1890ff', fontSize: '14px', fontWeight: 'normal' }}>
                            {` - 搜索结果`}
                        </span>
                    )}
                </h3>
                {getCurrentCourseList().length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px', 
                        backgroundColor: '#fafafa', 
                        borderRadius: '8px',
                        color: '#999'
                    }}>
                        {isSearching ? 
                            `未找到包含"${searchText}"的课程，请尝试其他关键词` : 
                            '暂无课程，请点击"添加课程"添加新课程'
                        }
                    </div>
                ) : (
                    <Row gutter={[16, 16]}>
                        {getCurrentCourseList().map((course, index) => (
                            <Col span={8} key={course.id}>
                                <Card 
                                    size="small"
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                                {isSearching ? (
                                                    // 高亮搜索关键词
                                                    course.name.split(new RegExp(`(${searchText})`, 'gi')).map((part, index) => 
                                                        part.toLowerCase() === searchText.toLowerCase() ? (
                                                            <span key={index} style={{ backgroundColor: '#fff2f0', color: '#cf1322' }}>
                                                                {part}
                                                            </span>
                                                        ) : part
                                                    )
                                                ) : course.name}
                                            </span>
                                            <Space>
                                                <Tag color={course.isActive === 1 ? 'green' : 'red'}>
                                                    {course.isActive === 1 ? '启用' : '禁用'}
                                                </Tag>
                                            </Space>
                                        </div>
                                    }
                                    style={{ marginBottom: '16px', minHeight: '220px' }}
                                    hoverable
                                >
                                    {/* 课程介绍重点显示 */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <Typography.Text strong style={{ color: 'balck', fontSize: '14px' }}>
                                            📚 课程介绍
                                        </Typography.Text>
                                        <Link href={`/admin_teacher/My_course?id=${course.id}`}>
                                            <Button type="link">
                                                课程详情
                                            </Button>
                                        </Link>
                                        <Typography.Paragraph   
                                            style={{ 
                                                margin: '8px 0 0 0', 
                                                color: 'black',
                                                fontSize: '13px',
                                                lineHeight: '1.6',
                                                backgroundColor: '#f8f9fa',
                                                padding: '12px',
                                                borderRadius: '6px',
                                                border: '1px solid #e9ecef',
                                                minHeight: '80px'
                                            }}
                                            ellipsis={{
                                                rows: 3, 
                                                expandable: true, 
                                                symbol: '展开详情'
                                            }}
                                        >
                                            {course.description || '该课程暂未添加详细介绍，请联系管理员完善课程信息。'}
                                        </Typography.Paragraph>
                                    </div>
                                    <Divider style={{ margin: '16px 0 12px 0' }} />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </div>
        </div>
    );
}
export default MyClass;