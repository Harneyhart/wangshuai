'use client';

// 班级管理页面(需要继续添加内容)
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Pagination } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses, getAllClasses, createClass, deleteClass, createCoursePlan, createHomework,  deleteCoursePlan,  createAttachment, getSubmissionsByHomeworkId, updateClassById, getAllTeachers, getAllCourseHours } from '@/lib/course/actions';
import { UserItem, StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, CreateAttachmentItem, SubmissionsWithRelations, } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { queryCoursePlansByClassIdList } from '@/utils/query';

type ClassWithTeachers = ClassesWithStudents & { teacherNames: string[] };

const Group = () => {
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

    // mock 班级数据
    const totalClasses = 5;
    const pageSize = 12;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(totalClasses / pageSize);
    const [jumpPage, setJumpPage] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
    const [classList, setClassList] = useState<ClassWithTeachers[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            // 1. 获取所有班级
            const classes = await getAllClasses();
            // 2. 获取所有课时
            const courseHours = await getAllCourseHours();
            // 3. 获取所有教师
            const teachers = await getAllTeachers();

            // 4. 聚合：为每个班级找出所有教师名字
            const classWithTeachers = classes.map(cls => {
                // 找到该班级的所有课时
                const relatedCourseHours = courseHours.filter(
                    ch => ch.plan?.class?.id === cls.id
                );
                // 课时下所有教师id
                const teacherIds = relatedCourseHours
                    .flatMap(ch => ch.teachers?.map(t => t.teacherId) || []);
                // 去重
                const uniqueTeacherIds = Array.from(new Set(teacherIds));
                // 查找教师名字
                const teacherNames = uniqueTeacherIds
                    .map(tid => teachers.find(t => t.id === tid)?.name)
                    .filter(Boolean);

                return {
                    ...cls,
                    teacherNames,
                };
            });

            setClassList(classWithTeachers as ClassWithTeachers[]);
            setLoading(false);
        };
        fetchData();
    }, []);

    const pagedClassList = classList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // 删除班级
    const handleDeleteClass = () => {
        if (selectedKeys.length === 0) return;
        modal.confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedKeys.length} 个班级吗？`,
            onOk: () => {
                const newList = classList.filter((_, idx) => !selectedKeys.includes(idx));
                setSelectedKeys([]);
                setClassList(newList as ClassWithTeachers[]);
            },
        });
    };
    // 添加班级
    const handleAddClass = () => {
        const now = new Date();
        const newClass = {
            id: `mock-${Date.now()}`,
            name: `班级${classList.length + 1}`,
            isActive: 1,
            createdAt: now,
            updatedAt: now,
            students: [],
            plans: [],
            teacherNames: [],
        };
        setClassList([...classList, newClass]);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 600 }}>班级管理</div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button type="primary" onClick={handleAddClass}>添加班级</Button>
                    <Button danger onClick={handleDeleteClass}>删除班级</Button>
                </div>
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '20px',
                marginTop: '20px',
            }}>
                {loading ? (
                    <div>加载中...</div>
                ) : (
                    pagedClassList.map((item, idx) => {
                        const globalIdx = (currentPage - 1) * pageSize + idx;
                        const selected = selectedKeys.includes(globalIdx);
                        return (
                            <div
                                key={item.id}
                                style={{
                                    background: selected ? '#e6f7ff' : '#f8f9fa',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px #f0f1f2',
                                    padding: '24px',
                                    minHeight: '160px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    border: selected ? '2px solid #1890ff' : '2px solid transparent',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div 
                                    onClick={() => {
                                        setSelectedKeys(selected
                                            ? selectedKeys.filter(k => k !== globalIdx)
                                            : [...selectedKeys, globalIdx]);
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        width: '100%',
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>{item.name}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div>班主任：{(item as any).teacherNames?.join('、') || '未分配'}</div>
                                        <div>人数：{item.students ? item.students.length : 0}人</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: 16, width: '100%' }}>
                                    <Button 
                                        type="primary" 
                                        size="small" 
                                        onClick={() => {
                                            router.push(`/admin_teacher/class-detail?id=${item.id}&name=${encodeURIComponent(item.name)}`);
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        查看详情
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {/* 分页和跳转 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 24 }}>
                <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={classList.length}
                    showSizeChanger={false}
                    onChange={page => setCurrentPage(page)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>跳转到</span>
                    <Input
                        style={{ width: 60 }}
                        value={jumpPage}
                        onChange={e => setJumpPage(e.target.value.replace(/[^\d]/g, ''))}
                        onPressEnter={e => {
                            const page = parseInt((e.target as HTMLInputElement).value);
                            if (page && page > 0 && page <= Math.ceil(classList.length / pageSize)) {
                                setCurrentPage(page);
                            } else {
                                message.error('请输入有效的页码');
                            }
                        }}
                        placeholder="页码"
                    />
                    <Button
                        onClick={() => {
                            const page = Number(jumpPage);
                            if (page >= 1 && page <= Math.ceil(classList.length / pageSize)) {
                                setCurrentPage(page);
                            } else {
                                message.error('请输入有效的页码');
                            }
                        }}
                        type="primary"
                        size="small"
                    >
                        跳转
                    </Button>
                </div>
            </div>
        </div>
    );
}
export default Group;