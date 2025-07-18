'use client';

// 课程管理页面
import React from 'react';
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Card } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses, getAllClasses, createClass, deleteClass, createCoursePlan, createHomework, deleteCoursePlan, createAttachment, getSubmissionsByHomeworkId, updateClassById, createCourse, deleteCourse, deleteAttachment } from '@/lib/course/actions';
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

const ClassList = () => {
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

    // 获取课程列表
    const getCourseList = async () => {
        try {
            console.log('Fetching courses...');
            const courses = await getAllCourses();
            console.log('Courses fetched:', courses);
            setCourseList(courses);
        } catch (error) {
            console.error('获取课程列表失败:', error);
            message.error('获取课程列表失败: ' + (error instanceof Error ? error.message : '未知错误'));
        }
    };

    // 添加课程处理函数
    const handleAddCourse = () => {
        setAddCourseForm({ name: '', description: ''});
        setModalAddCourse(true);
    };

    // 确认添加课程
    const confirmAddCourse = async () => {
        if (!addCourseForm.name) {
            message.warning('请输入课程名称');
            return;
        }
        if (!addCourseForm.description) {
            message.warning('请输入课程描述');
            return;
        }

        try {
            await createCourse(addCourseForm);
            message.success('课程添加成功！');
            setModalAddCourse(false);
            await getCourseList(); // 刷新课程列表
        } catch (error) {
            message.error('添加课程失败');
        }
    };

    // 删除课程处理函数
    const handleDeleteCourse = async () => {
        await getCourseList();
        setModalDeleteCourse(true);
    };

    // 确认删除课程
    const confirmDeleteCourse = async () => {
        if (!selectedCourse) {
            message.warning('请选择要删除的课程');
            return;
        }
        
        const courseToDelete = courseList.find(course => course.id === selectedCourse);
        
        modal.confirm({
            title: '确认删除课程',
            content: `确定要彻底删除课程"${courseToDelete?.name}"吗？此操作无法恢复！`,
            okText: '确定删除',
            cancelText: '取消',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await deleteCourse(selectedCourse);
                    message.success('课程已彻底删除！所有相关数据已从数据库中移除');
                    setModalDeleteCourse(false);
                    setSelectedCourse('');
                    await getCourseList(); // 刷新课程列表
                } catch (error) {
                    message.error('删除课程失败');
                }
            },
            onCancel() {
                console.log('取消删除');
            },
        });
    };

    // 组件加载时获取课程列表
    useEffect(() => {
        getCourseList();
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

    const handleClearSearch = () => {
        setSearchText('');
        setFilteredCourseList(courseList);
        setIsSearching(false);
        message.success('已清空搜索条件');
    };

    // 获取当前显示的课程列表
    const getCurrentCourseList = () => {
        return isSearching ? filteredCourseList : courseList;
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>课程管理</div>
            
            {/* 操作按钮区域 */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', marginLeft: '800px' }}>
                <Button 
                    type="primary" 
                    onClick={handleAddCourse}
                    style={{ backgroundColor: '#1890ff', right: '60px' }}
                >
                    添加课程
                </Button>
                <Button 
                    danger 
                    onClick={handleDeleteCourse}
                    style={{ right: '60px' }}
                >
                    删除课程
                </Button>
            </div>

                        {/* 搜索区域 */}
                        <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: '#fafafa', 
                borderRadius: '8px',
                border: '1px solid #d9d9d9'
            }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col span={8}>
                        <Input 
                            placeholder="请输入课程名称进行搜索..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onPressEnter={handleSearch}
                            allowClear
                        />
                    </Col>
                    <Col span={8}>
                        <Space>
                            <Button 
                                type="primary" 
                                onClick={handleSearch}
                                disabled={!searchText.trim()}
                            >
                                搜索
                            </Button>
                            <Button 
                                onClick={handleClearSearch}
                                disabled={!isSearching}
                            >
                                清空
                            </Button>
                        </Space>
                    </Col>
                    <Col span={8}>
                        {isSearching && (
                            <Tag color="blue" style={{ left: '110px' }}>
                                搜索中: "{searchText}" (找到 {filteredCourseList.length} 个结果)
                            </Tag>
                        )}
                    </Col>
                </Row>
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
                                                {/* <Tag color={
                                                    course.description?.includes('必修') ? 'red' :
                                                    course.description?.includes('选修') ? 'blue' : 'green'
                                                }>
                                                </Tag> */}
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
                                        <Link href={`/admin_teacher/course-detail?id=${course.id}`}>
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

            {/* 添加课程弹窗 */}
            <Modal
                title="添加课程"
                open={modalAddCourse}
                onOk={confirmAddCourse}
                onCancel={() => setModalAddCourse(false)}
                width={600}
                okText="添加"
                cancelText="取消"
            >
                <Form layout="vertical">
                    <Form.Item label="课程名称" required>
                        <Input 
                            placeholder="请输入课程名称"
                            value={addCourseForm.name}
                            onChange={(e) => setAddCourseForm({...addCourseForm, name: e.target.value})}
                        />
                    </Form.Item>
                    <Form.Item label="课程介绍" required>
                        <Input.TextArea 
                            rows={4} 
                            placeholder="请输入课程介绍"
                            value={addCourseForm.description}
                            onChange={(e) => setAddCourseForm({...addCourseForm, description: e.target.value})}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 删除课程弹窗 */}
            <Modal
                title="删除课程"
                open={modalDeleteCourse}
                onOk={confirmDeleteCourse}
                onCancel={() => {
                    setModalDeleteCourse(false);
                    setSelectedCourse('');
                }}
                width={500}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
            >
                <Form layout="vertical">
                    <Form.Item label="选择要删除的课程" required>
                        <Select 
                            placeholder={courseList.length === 0 ? "暂无可删除的课程" : "请选择要删除的课程"}
                            value={selectedCourse}
                            onChange={setSelectedCourse}
                            disabled={courseList.length === 0}
                        >
                            {courseList.map(course => (
                                <Select.Option key={course.id} value={course.id}>
                                    {course.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    {courseList.length === 0 && (
                        <div style={{ 
                            backgroundColor: '#f6ffed', 
                            border: '1px solid #b7eb8f',
                            borderRadius: '6px',
                            padding: '12px',
                            marginTop: '16px'
                        }}>
                            <p style={{ color: '#389e0d', margin: 0 }}>
                                📝 当前没有可删除的课程
                            </p>
                        </div>
                    )}

                    {courseList.length > 0 && (
                        <div style={{ 
                            backgroundColor: '#fff2f0', 
                            border: '1px solid #ffccc7',
                            borderRadius: '6px',
                            padding: '12px',
                            marginTop: '16px'
                        }}>
                            <p style={{ color: '#cf1322', margin: 0 }}>
                                ⚠️ 警告：这是硬删除操作！删除课程将会彻底从数据库中移除该课程下的所有相关数据，包括：
                            </p>
                            <ul style={{ color: '#cf1322', marginTop: '8px', marginBottom: 0 }}>
                                <li>课程的所有课程计划</li>
                                <li>课程的所有课时安排及教师分配</li>
                                <li>课程的所有作业及学生提交记录</li>
                                <li>相关的所有附件关系</li>
                                <li>课程本身的记录</li>
                            </ul>
                            <p style={{ color: '#cf1322', marginTop: '8px', marginBottom: 0, fontWeight: 'bold' }}>
                                数据将无法恢复，请谨慎操作！
                            </p>
                        </div>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
export default ClassList;