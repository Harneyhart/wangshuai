'use client';

// 班级管理页面
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Pagination, Checkbox } from 'antd';
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

type AttachmentItemWithId = CreateAttachmentItem & {
    id?: string;
    fileName?: string;
    createAt?: string;
    fileKey?: string;
}

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
    const [modalAddClassVisible, setModalAddClassVisible] = useState(false);

    // 搜索相关状态
    const [searchText, setSearchText] = useState('');
    const [searchType, setSearchType] = useState('name'); // name, fileName, coursePlanId, createdAt
    const [filteredGroupList, setFilteredGroupList] = useState<ClassWithTeachers[]>([]);
    const [isSearching, setIsSearching] = useState(false); // 是否处于搜索状态

    // mock 班级数据
    const totalClasses = 5;
    const pageSize = 12;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(totalClasses / pageSize);
    const [jumpPage, setJumpPage] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupList, setGroupList] = useState<ClassWithTeachers[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [addClassForm, setAddClassForm] = useState<CreateClassItem>({
        name: '',
    });
    
    // 添加班级相关状态
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
    const [newClassName, setNewClassName] = useState('');
    const [classStudentCount, setClassStudentCount] = useState(0);
    const [classTeachers, setClassTeachers] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            // 1. 获取所有班级
            const classes = await getAllClasses();
            // 2. 获取所有课时
            const courseHours = await getAllCourseHours();
            // 3. 获取所有教师
            const teachersData = await getAllTeachers();
            // 4. 获取所有学生
            const studentsData = await getAllStudents();
            
            // 设置教师和学生数据
            setTeachers(teachersData);
            setStudents(studentsData);
            
            // 5. 聚合：为每个班级找出所有教师名字
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
                    .map(tid => teachersData.find(t => t.id === tid)?.name)
                    .filter(Boolean);

                return {
                    ...cls,
                    teacherNames,
                };
            });

            setGroupList(classWithTeachers as ClassWithTeachers[]);
            setLoading(false);
        };
        fetchData();
    }, []);

    const pagedClassList = groupList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    
    // 获取当前显示的班级列表
    const getCurrentClassList = () => {
        return isSearching ? filteredGroupList : pagedClassList;
    };

    // 删除班级
    const handleDeleteClass = () => {
        if (selectedKeys.length === 0) {
            message.warning('请选择要删除的班级');
            return;
        }
        
        const selectedClasses = groupList.filter(cls => selectedKeys.includes(cls.id));
        
        modal.confirm({
            title: '确认删除班级',
            content: (
                <div>
                    <p>确定要删除以下 {selectedKeys.length} 个班级吗？</p>
                    <ul style={{ margin: '8px 0', paddingLeft: 16, maxHeight: '200px', overflowY: 'auto' }}>
                        {selectedClasses.map(cls => (
                            <li key={cls.id} style={{ color: '#cf1322' }}>{cls.name}</li>
                        ))}
                    </ul>
                    <div style={{ color: 'red', fontSize: '12px', marginTop: '8px' }}>
                        ⚠️ 此操作将彻底删除班级及其所有相关数据（学生关系、课程计划、作业等），不可恢复！
                    </div>
                </div>
            ),
            okText: '确定删除',
            cancelText: '取消',
            okType: 'danger',
            onOk: async () => {
                const deletePromises = selectedKeys.map(async (classId) => {
                    try {
                        const result = await deleteClass(classId);
                        return { success: true, classId, result };
                    } catch (error) {
                        console.error(`删除班级 ${classId} 失败:`, error);
                        return { success: false, classId, error };
                    }
                });

                try {
                    const results = await Promise.all(deletePromises);
                    const successCount = results.filter(r => r.success).length;
                    const failCount = results.filter(r => !r.success).length;

                    if (successCount > 0) {
                        // 删除成功的从本地列表中移除
                        const successIds = results.filter(r => r.success).map(r => r.classId);
                        setGroupList(prev => prev.filter(cls => !successIds.includes(cls.id)));
                        setSelectedKeys([]);
                    }

                    if (failCount === 0) {
                        message.success(`成功删除 ${successCount} 个班级`);
                    } else if (successCount === 0) {
                        message.error(`删除失败，${failCount} 个班级删除失败`);
                    } else {
                        message.warning(`部分删除成功：${successCount} 个成功，${failCount} 个失败`);
                    }
                } catch (error) {
                    console.error('批量删除时发生错误:', error);
                    message.error('删除操作失败，请稍后重试');
                }
            },
        });
    };
    // 添加班级 - 打开弹窗
    const handleAddClass = () => {
        // 重置表单数据
        setNewClassName('');
        setSelectedTeachers([]);
        setClassStudentCount(0);
        setClassTeachers([]);
        setModalAddClassVisible(true);
    };

    // 提交添加班级
    const handleSubmitAddClass = async () => {
        if (!newClassName.trim()) {
            message.error('请输入班级名称');
            return;
        }

        try {
            // 创建新班级
            const newClassData = await createClass({ name: newClassName.trim() });
            
            if (newClassData) {
                const now = new Date();
                const newClass = {
                    id: `new-${Date.now()}`, // 使用时间戳作为临时ID
                    name: newClassName.trim(),
                    isActive: 1,
                    createdAt: now,
                    updatedAt: now,
                    students: [],
                    plans: [],
                    teacherNames: selectedTeachers.map(id => 
                        teachers.find(t => t.id === id)?.name || ''
                    ).filter(Boolean),
                };
                setGroupList([...groupList, newClass]);
                setModalAddClassVisible(false);
                message.success('班级创建成功');
                
                // 重新获取数据
                window.location.reload(); // 简单刷新，也可以重新调用fetchData
            }
        } catch (error) {
            console.error('创建班级失败:', error);
            message.error('创建班级失败');
        }
    };

    // 根据班级名称获取学生数量（查询 students_to_classes 表）
    const getStudentCountByClassName = async (className: string) => {
        try {
            // 查找是否已存在该班级
            const existingClass = groupList.find(cls => cls.name === className);
            if (existingClass) {
                // 如果是已存在的班级，调用API获取实时学生数量
                try {
                    const response = await fetch(`/api/classes/student-count?classId=${existingClass.id}`);
                    if (response.ok) {
                        const data = await response.json();
                        return data.data.studentCount;
                    }
                } catch (apiError) {
                    console.error('API调用失败，使用本地数据:', apiError);
                }
                // API调用失败时使用本地数据
                return existingClass.students ? existingClass.students.length : 0;
            }

            // 新班级，还没有学生
            return 0;
        } catch (error) {
            console.error('获取学生数量失败:', error);
            return 0;
        }
    };

    // 根据班级名称获取班导师（通过复杂的表关联）
    const getTeachersByClassName = async (className: string) => {
        try {
            // 查找是否已存在该班级
            const existingClass = groupList.find(cls => cls.name === className);
            if (existingClass) {
                // 如果是已存在的班级，调用API获取实时教师信息
                try {
                    const response = await fetch(`/api/classes/teachers?classId=${existingClass.id}`);
                    if (response.ok) {
                        const data = await response.json();
                        return data.data.teachers;
                    }
                } catch (apiError) {
                    console.error('API调用失败，使用本地数据:', apiError);
                }
                // API调用失败时使用本地数据
                return existingClass.teacherNames || [];
            }

            // 对于新班级，尝试通过班级名称查询
            try {
                const response = await fetch(`/api/classes/teachers?className=${encodeURIComponent(className)}`);
                if (response.ok) {
                    const data = await response.json();
                    return data.data.teachers;
                }
            } catch (apiError) {
                console.error('新班级教师查询失败:', apiError);
            }

            // 新班级，还没有分配教师
            return [];
        } catch (error) {
            console.error('获取班导师失败:', error);
            return [];
        }
    };

    // 当班级名称改变时，自动计算人数和班导师
    const handleClassNameChange = async (name: string) => {
        setNewClassName(name);
        if (name.trim()) {
            // 查询班级人数
            const studentCount = await getStudentCountByClassName(name.trim());
            setClassStudentCount(studentCount);
            
            // 查询班导师
            const teacherNames = await getTeachersByClassName(name.trim());
            setClassTeachers(teacherNames);
        } else {
            setClassStudentCount(0);
            setClassTeachers([]);
        }
    };

    // 处理单个班级的选择
    const handleClassSelect = (classId: string, checked: boolean) => {
        setSelectedKeys(prev => {
            if (checked) {
                return [...prev, classId];
            } else {
                return prev.filter(id => id !== classId);
            }
        });
    };

    // 处理全选
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentClassIds = getCurrentClassList().map(cls => cls.id);
            setSelectedKeys(currentClassIds);
        } else {
            setSelectedKeys([]);
        }
    };

    // 检查是否全选
    const isAllSelected = () => {
        const currentClassIds = getCurrentClassList().map(cls => cls.id);
        return currentClassIds.length > 0 && currentClassIds.every(id => selectedKeys.includes(id));
    };

    // 检查是否部分选择
    const isIndeterminate = () => {
        const currentClassIds = getCurrentClassList().map(cls => cls.id);
        const selectedCount = currentClassIds.filter(id => selectedKeys.includes(id)).length;
        return selectedCount > 0 && selectedCount < currentClassIds.length;
    };

    // 初始化过滤列表
    useEffect(() => {
        if (!isSearching) {
            setFilteredGroupList(groupList)
        }
    }, [groupList, isSearching]);

    // 处理搜索
    const handleSearch = () => {
        if (!searchText.trim()) {
            message.warning('请输入搜索关键词');
            return;
        }
        const filtered = groupList.filter(group => 
            group.name.toLowerCase().includes(searchText.toLowerCase().trim())
        );
        setFilteredGroupList(filtered);
        setIsSearching(true);
        if (filtered.length === 0) {
            message.info('未找到匹配的班级');
        } else {
            message.success(`找到 ${filtered.length} 个匹配的班级`);
        }
    }

    const handleClearSearch = () => {
        setSearchText('');
        setFilteredGroupList(groupList);
        setIsSearching(false);
        message.success('已清空搜索条件');
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>班级管理</div>
                    {getCurrentClassList().length > 0 && (
                        <Checkbox
                            checked={isAllSelected()}
                            indeterminate={isIndeterminate()}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                        >
                            全选 ({selectedKeys.length}/{getCurrentClassList().length})
                        </Checkbox>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button type="primary" onClick={handleAddClass}>添加班级</Button>
                    <Button 
                        danger 
                        onClick={handleDeleteClass}
                        disabled={selectedKeys.length === 0}
                    >
                        删除班级 {selectedKeys.length > 0 ? `(${selectedKeys.length})` : ''}
                    </Button>
                </div>
            </div>
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
                                placeholder="请输入班级名称进行搜索..."
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
                                <Tag color="blue" style={{ left: '60px', textAlign: 'left' }}>
                                    搜索中: "{searchText}" (找到 {filteredGroupList.length} 个结果)
                                </Tag>
                            )}
                        </Col>
                    </Row>
                </div>
            
            {/* 搜索结果统计 */}
            {isSearching && (
                <div style={{ 
                    marginBottom: '20px', 
                    padding: '12px 16px', 
                    backgroundColor: '#f6ffed', 
                    border: '1px solid #b7eb8f',
                    borderRadius: '6px',
                    color: '#389e0d'
                }}>
                    📊 搜索结果：找到 {filteredGroupList.length} 个匹配 "{searchText}" 的班级
                    {filteredGroupList.length === 0 && (
                        <span style={{ color: '#ff4d4f', marginLeft: '10px' }}>
                            - 建议检查拼写或尝试其他关键词
                        </span>
                    )}
                </div>
            )}
            
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '20px',
                marginTop: '20px',
            }}>
                {loading ? (
                    <div>加载中...</div>
                ) : getCurrentClassList().length === 0 ? (
                    <div style={{ 
                        gridColumn: '1 / -1',
                        textAlign: 'center', 
                        padding: '60px 20px', 
                        backgroundColor: '#fafafa', 
                        borderRadius: '12px',
                        color: '#999',
                        border: '2px dashed #d9d9d9'
                    }}>
                        {isSearching ? (
                            <div>
                                <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
                                <div style={{ fontSize: '16px', marginBottom: '8px' }}>未找到匹配的班级</div>
                                <div style={{ fontSize: '14px' }}>请尝试其他关键词或清空搜索条件</div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: '24px', marginBottom: '12px' }}>📚</div>
                                <div style={{ fontSize: '16px' }}>暂无班级数据</div>
                            </div>
                        )}
                    </div>
                ) : (
                    getCurrentClassList().map((item, idx) => {
                        return (
                            <div
                                key={item.id}
                                style={{
                                    background: '#f8f9fa',
                                    borderRadius: '10px',
                                    boxShadow: '0 2px 8px #f0f1f2',
                                    padding: '24px',
                                    minHeight: '160px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    border: selectedKeys.includes(item.id) 
                                        ? '2px solid #1890ff' 
                                        : '2px solid transparent',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                }}
                            >
                                {/* 复选框 */}
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    zIndex: 10
                                }}>
                                    <Checkbox
                                        checked={selectedKeys.includes(item.id)}
                                        onChange={(e) => handleClassSelect(item.id, e.target.checked)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div style={{ width: '100%' }}>
                                    <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>
                                        {isSearching ? (
                                            // 高亮搜索关键词
                                            item.name.split(new RegExp(`(${searchText})`, 'gi')).map((part, index) => 
                                                part.toLowerCase() === searchText.toLowerCase() ? (
                                                    <span key={index} style={{ backgroundColor: '#fff2f0', color: '#cf1322' }}>
                                                        {part}
                                                    </span>
                                                ) : part
                                            )
                                        ) : item.name}
                                    </div>
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
            {!isSearching && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 24 }}>
                <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={groupList.length}
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
                            if (page && page > 0 && page <= Math.ceil(groupList.length / pageSize)) {
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
                            if (page >= 1 && page <= Math.ceil(groupList.length / pageSize)) {
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
            )}

            {/* 添加班级弹窗 */}
            <Modal
                title="添加班级"
                open={modalAddClassVisible}
                onOk={handleSubmitAddClass}
                onCancel={() => setModalAddClassVisible(false)}
                width={600}
                okText="创建班级"
                cancelText="取消"
            >
                <div style={{ padding: '20px 0' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            班级名称 <span style={{ color: '#ff4d4f' }}>*</span>
                        </label>
                        <Input
                            placeholder="请输入班级名称"
                            value={newClassName}
                            onChange={(e) => {
                                const value = e.target.value;
                                handleClassNameChange(value);
                            }}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            班级人数
                        </label>
                        <div style={{ 
                            padding: '8px 12px', 
                            backgroundColor: '#f5f5f5', 
                            borderRadius: '6px',
                            border: '1px solid #d9d9d9'
                        }}>
                            {classStudentCount > 0 ? `${classStudentCount} 人` : '请先输入班级名称'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            *人数通过 students_to_classes 表自动计算
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            班导师
                        </label>
                        <div style={{ 
                            padding: '8px 12px', 
                            backgroundColor: '#f5f5f5', 
                            borderRadius: '6px',
                            border: '1px solid #d9d9d9',
                            minHeight: '40px'
                        }}>
                            {classTeachers.length > 0 ? (
                                <div>
                                    {classTeachers.map((teacher, index) => (
                                        <Tag key={index} color="blue" style={{ marginBottom: '4px' }}>
                                            {teacher}
                                        </Tag>
                                    ))}
                                </div>
                            ) : (
                                '请先输入班级名称'
                            )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            *班导师通过 classes → course_plans → course_hours → teachers_to_course_hours → teachers 表关联查询
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            选择教师 (可选)
                        </label>
                        <Select
                            mode="multiple"
                            placeholder="请选择教师"
                            value={selectedTeachers}
                            onChange={setSelectedTeachers}
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="children"
                        >
                            {teachers.map((teacher) => (
                                <Select.Option key={teacher.id} value={teacher.id}>
                                    {teacher.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    {newClassName && (
                        <div style={{ 
                            padding: '12px', 
                            backgroundColor: '#e6f7ff', 
                            borderRadius: '6px',
                            border: '1px solid #91d5ff'
                        }}>
                            <div style={{ fontWeight: '500', marginBottom: '8px', color: '#1890ff' }}>
                                📋 班级预览
                            </div>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                                <div>班级名称：{newClassName}</div>
                                <div>预计人数：{classStudentCount} 人</div>
                                <div>班导师：{classTeachers.join('、') || '无'}</div>
                                <div>选择教师：{selectedTeachers.length > 0 ? 
                                    selectedTeachers.map(id => teachers.find(t => t.id === id)?.name).join('、') : 
                                    '无'
                                }</div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
export default Group;