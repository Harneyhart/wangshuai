'use client';

// 作业批改页面
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { App, Col, Row, Space, message, Button, Table, Tag, Modal, Input, Typography, Descriptions, List, Card, Form, Select } from 'antd';
import { getSubmissionsForCurrentTeacher, getAttachmentsByCoursePlanId, getHomeworksForCurrentTeacher } from '@/lib/course/actions';
import { SubmissionsWithRelations } from '@/lib/course/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LeftCircleFilled } from '@ant-design/icons';

// 使用数据库返回的SubmissionsWithRelations类型
type HomeworkSubmission = SubmissionsWithRelations;

// 作业数据类型（去重后的）
type HomeworkItem = {
    id: string; // 作业id   
    name: string;   // 作业名称
    courseName: string; // 课程名称
    submissionCount: number; // 作业提交人数
    gradedCount: number; // 作业评分人数
    totalStudentCount: number; // 作业发布班级的总学生数
    plan: any; // 作业所属课程计划
    deadline?: string; // 作业截止时间
    createdAt?: string; // 作业创建时间
};


// 批改记录类型定义
type GradingRecord = {
    key: string;
    homework: string;
    studentName: string;
    submitTime: string;
    score?: number | null;
    maxScore: number;
    comment?: string;
    status: '未评分' | '已评分';
    description: string;
    id: string;
    studentId: string;
    homeworkId: string;
    attachments?: any[];
    courseName?: string;
    className?: string;
  };


const Homework = () => {
    const { message } = App.useApp();
    const router = useRouter();

    // 搜索相关状态
    const [searchText, setSearchText] = useState('');
    const [filteredHomeworkList, setFilteredHomeworkList] = useState<HomeworkItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // 班级选择相关状态
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
    const [classStudentCounts, setClassStudentCounts] = useState<{[className: string]: number}>({});
    const [totalStudentCount, setTotalStudentCount] = useState(0);

    // 作业相关状态
    const [selectedHomework, setSelectedHomework] = useState<any>(null);
    const [data, setData] = useState<HomeworkItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [allClasses, setAllClasses] = useState<any[]>([]);
    const [classSelectModalVisible, setClassSelectModalVisible] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [coursePlans, setCoursePlans] = useState<any[]>([]);

    // 作业详情弹窗状态
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [studentAttachments, setStudentAttachments] = useState<any[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);

    // 获取当前教师所教的班级
    const getTeacherClasses = async () => {
        try {
            // 使用现有的函数获取当前教师的课程计划
            const { getCoursePlansForCurrentTeacher } = await import('@/lib/course/actions');
            const coursePlans = await getCoursePlansForCurrentTeacher();
            
            if (Array.isArray(coursePlans)) {
                // 从课程计划中提取教师所教的班级
                const teacherClasses = coursePlans
                    .filter((plan: any) => plan.class && plan.course)
                    .map((plan: any) => ({
                        id: plan.class.id,
                        name: plan.class.name,
                        courseName: plan.course.name,
                        coursePlanId: plan.id
                    }));
                
                // 去重，因为同一个班级可能有多个课程
                const uniqueClasses = teacherClasses.filter((classItem: any, index: number, self: any[]) => 
                    index === self.findIndex((c: any) => c.id === classItem.id)
                );
                
                setTeacherClasses(uniqueClasses);
                console.log('获取到教师班级:', uniqueClasses);
            } else {
                console.error('获取课程计划失败:', coursePlans);
                setTeacherClasses([]);
            }
        } catch (error) {
            console.error('获取教师班级失败:', error);
            setTeacherClasses([]);
        }
    };

    // 获取作业的学生总数
    const getHomeworkStudentCount = async (homeworkId: string) => {
        try {
            const response = await fetch(`/api/homework/student-count?homeworkId=${homeworkId}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    return result.data.studentCount || 0;
                }
            }
        } catch (error) {
            console.error(`获取作业 ${homeworkId} 学生数量失败:`, error);
        }
        return 0;
    };

    // 计算应交人数：根据是否有班级筛选来动态计算
    const getExpectedStudentCount = () => {
        if (selectedClass && selectedClass.trim()) {
            // 如果筛选了特定班级，返回该班级的学生数
            return classStudentCounts[selectedClass] || 0;
        } else {
            // 如果没有筛选班级，返回所有发布该作业的班级的学生总数
            // 从 classStudentCounts 中获取所有班级的学生数总和
            return Object.values(classStudentCounts).reduce((total: number, count: number) => total + count, 0);
        }
    };

    // 从数据库读取当前教师所教班级的作业数据
    useEffect(() => {
        const loadHomeworkData = async () => {
            // 先获取教师班级
            console.log('开始获取教师班级...');
            await getTeacherClasses();
            console.log('教师班级获取完成');
            try {
                setLoading(true);
                console.log('开始加载作业数据...');
                
                // 获取当前教师的作业列表（包括没有提交的作业）
                const homeworks = await getHomeworksForCurrentTeacher();
                console.log('获取到的作业数据:', homeworks);
                
                if (Array.isArray(homeworks)) {
                    // 获取当前教师班级学生的提交数据
                    const submissions = await getSubmissionsForCurrentTeacher();
                    console.log('获取到的作业提交数据:', submissions);
                    
                    // 按作业ID去重，统计每个作业的提交情况
                    const homeworkMap = new Map<string, HomeworkItem>();
                    
                    // 先处理所有作业，设置默认值
                    for (const homework of homeworks) {
                        const totalStudentCount = await getHomeworkStudentCount(homework.key);
                        homeworkMap.set(homework.key, {
                            id: homework.key,
                            name: homework.homework,
                            courseName: homework.courseName || '未知课程',
                            submissionCount: 0,
                            gradedCount: 0,
                            totalStudentCount: totalStudentCount,
                            plan: { 
                                id: homework.coursePlanId,
                                course: { id: homework.coursePlanId, name: homework.courseName }
                            },
                            deadline: homework.deadline,
                            createdAt: homework.createdAt
                        });
                    }
                    
                    // 统计提交情况
                    submissions.forEach(submission => {
                        const homeworkId = submission.homework?.id;
                        if (!homeworkId) return;
                        
                        const homework = homeworkMap.get(homeworkId);
                        if (homework) {
                            homework.submissionCount++;
                            if (submission.score !== null) {
                                homework.gradedCount++;
                            }
                        }
                    });
                    
                    const homeworkArray = Array.from(homeworkMap.values());
                    setData(homeworkArray);
                    
                    if (homeworkArray.length > 0) {
                        message.success(`成功加载 ${homeworkArray.length} 个作业`);
                    } else {
                        message.info('当前没有需要批改的作业');
                    }
                } else {
                    message.error('获取作业数据失败');
                    setData([]);
                }
            } catch (error) {
                console.error('读取作业数据失败:', error);
                message.error('加载作业数据失败');
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        loadHomeworkData();
    }, []);

    // 添加手动刷新功能
    const refreshSubmissions = async () => {
        try {
            setLoading(true);
            console.log('手动刷新作业数据...');
            
            // 获取当前教师的作业列表（包括没有提交的作业）
            const homeworks = await getHomeworksForCurrentTeacher();
            console.log('刷新获取到的作业数据:', homeworks);
            
            if (Array.isArray(homeworks)) {
                // 获取当前教师班级学生的提交数据
                const submissions = await getSubmissionsForCurrentTeacher();
                console.log('刷新获取到的提交数据:', submissions);
                
                // 重新处理数据
                const homeworkMap = new Map<string, HomeworkItem>();
                
                // 先处理所有作业，设置默认值
                for (const homework of homeworks) {
                    const totalStudentCount = await getHomeworkStudentCount(homework.key);
                    homeworkMap.set(homework.key, {
                        id: homework.key,
                        name: homework.homework,
                        courseName: homework.courseName || '未知课程',
                        submissionCount: 0,
                        gradedCount: 0,
                        totalStudentCount: totalStudentCount,
                        plan: { 
                            id: homework.coursePlanId,
                            course: { id: homework.coursePlanId, name: homework.courseName }
                        },
                        deadline: homework.deadline,
                        createdAt: homework.createdAt
                    });
                }
                
                // 统计提交情况
                submissions.forEach(submission => {
                    const homeworkId = submission.homework?.id;
                    if (!homeworkId) return;
                    
                    const homework = homeworkMap.get(homeworkId);
                    if (homework) {
                        homework.submissionCount++;
                        if (submission.score !== null) {
                            homework.gradedCount++;
                        }
                    }
                });
                
                const homeworkArray = Array.from(homeworkMap.values());
                setData(homeworkArray);
                message.success(`刷新成功，共 ${homeworkArray.length} 个作业`);
            } else {
                message.error('获取作业数据失败');
                setData([]);
            }
        } catch (error) {
            console.error('刷新数据失败:', error);
            message.error('刷新失败');
        } finally {
            setLoading(false);
        }
    };

    // 跳转到作业批改页面
    const handleGotoGrading = (record: HomeworkItem) => {
        const homeworkId = record.id;
        const homeworkName = record.name;
        const courseId = record.plan?.course?.id;
        const courseName = record.courseName;
        
        // 构建查询参数
        const params = new URLSearchParams({
            homeworkId: homeworkId || '',
            homeworkName: homeworkName || '',
            courseId: courseId || '',
            courseName: courseName || '',
        });
        
        router.push(`/admin_teacher/homework-grading?${params.toString()}`);
    };

    // 获取作业附件信息
    const loadHomeworkAttachments = async (homework: HomeworkItem) => {
        try {
            setAttachmentsLoading(true);
            
            // 获取教师上传的附件（通过课程计划）
            // 暂时移除教师附件功能，专注于学生提交的附件

            // 获取学生提交的附件（通过作业提交记录）
            const submissions = await getSubmissionsForCurrentTeacher();
            const homeworkSubmissions = submissions.filter(sub => sub.homework?.id === homework.id);
            
            // 收集所有学生提交的附件
            const allStudentAttachments: any[] = [];
            homeworkSubmissions.forEach(submission => {
                if (submission.attachments && submission.attachments.length > 0) {
                    submission.attachments.forEach(att => {
                        allStudentAttachments.push({
                            ...att.attachment,
                            studentName: submission.student?.name || '未知学生',
                            submitTime: submission.createdAt,
                        });
                    });
                }
            });
            
            setStudentAttachments(allStudentAttachments);
        } catch (error) {
            console.error('获取作业附件失败:', error);
            message.error('获取附件信息失败');
        } finally {
            setAttachmentsLoading(false);
        }
    };

    // 渲染文件链接
    const renderFileLink = (file: any) => {
        const getFileIcon = (fileName: string) => {
            const ext = fileName.split('.').pop()?.toLowerCase();
            switch (ext) {
                case 'pdf': return '📄';
                case 'doc':
                case 'docx': return '📝';
                case 'xls':
                case 'xlsx': return '📊';
                case 'ppt':
                case 'pptx': return '📈';
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif': return '🖼️';
                case 'zip':
                case 'rar': return '📦';
                default: return '📎';
            }
        };

        return (
            <Link 
                href={`/api/attachment/view?key=${file.fileKey}`} 
                target="_blank"
                style={{ 
                    color: '#1890ff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}
            >
                <span>{getFileIcon(file.name)}</span>
                <span>{file.name}</span>
            </Link>
        );
    };

    // 获取当前显示的作业列表
    const getCurrentHomeworkList = () => {
        return isSearching ? filteredHomeworkList : data;
    };

    const columns = [
        {
            title: '序号',
            dataIndex: 'index',
            width: 80,
            render: (_: any, _record: any, idx: number) => idx + 1,
        },
        {
            title: '课程名称',
            dataIndex: 'courseName',
            width: 200,
            align: 'center' as const,
            render: (courseName: string) => (
                <div>
                    {courseName}
                </div>
            )
        },
        {
            title: '作业名称',
            dataIndex: 'name',
            width: 230,
            ellipsis: true,
            render: (name: string) => (
                <div>
                    {name}
                </div>
            )
        },
        {
            title: '截止时间',
            dataIndex: 'deadline',
            width: 140,
            align: 'center' as const,
            render: (deadline: string) => {
                if (!deadline) return '-';
                const isOverdue = dayjs(deadline).isBefore(dayjs());
                return (
                    <span style={{ 
                        color: isOverdue ? '#ff4d4f' : '#666', 
                        fontSize: '13px',
                        fontWeight: isOverdue ? 600 : 400
                    }}>
                        {dayjs(deadline).format('MM-DD HH:mm')}
                    </span>
                );
            },
        },
        {
            title: '提交情况',
            dataIndex: 'submissionInfo',
            width: 140,
            align: 'center' as const,
            render: (_: any, record: HomeworkItem) => (
                <div>
                    <div style={{ fontSize: '12px' }}>
                        <span style={{ color: '#52c41a' }}>已批: {record.gradedCount}</span>
                        <span style={{ margin: '0 4px', color: '#d9d9d9' }}>|</span>
                        <span style={{ color: '#fa8c16' }}>待批: {record.submissionCount - record.gradedCount}</span>
                    </div>
                </div>
            ),
        },
        {
            title: '操作',
            dataIndex: 'action',
            width: 170,
            align: 'center' as const,
            render: (_: any, record: HomeworkItem) => (
                <Space size="small">
                    <a onClick={async () => {
                        setSelectedHomework(record);
                        setDetailModalVisible(true);
                        await loadHomeworkAttachments(record);
                    }}>查看详情</a>
                    <a onClick={() => handleGotoGrading(record)}>批改作业</a>
                </Space>
            ),
        },
    ];

    // 初始化过滤列表
    useEffect(() => {
        if (!isSearching && !selectedClass) {
            setFilteredHomeworkList(data);
        }
    }, [data, isSearching, selectedClass]);

    // 处理班级选择变化
    const handleClassChange = (value: string) => {
        setSelectedClass(value);
        if (value) {
            // 根据选中的班级筛选作业
            const filtered = data.filter(homework => {
                // 这里可以根据班级信息筛选作业
                // 暂时显示所有作业，后续可以根据具体需求调整筛选逻辑
                return true;
            });
            setFilteredHomeworkList(filtered);
            setIsSearching(true);
        } else {
            // 清空筛选，显示所有作业
            setFilteredHomeworkList(data);
            setIsSearching(false);
        }
    };

    return (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 600 }}>我的作业批改</div>
                <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                    查看我教的班级的所有作业，包括已提交和未提交的作业，点击"批改作业"进入具体批改页面
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
                    <Col span={12}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 400, color: '#333' }}>选择班级：</span>
                            <Select
                                placeholder="请选择要查看的班级"
                                value={selectedClass}
                                onChange={(value) => {
                                    setSelectedClass(value);
                                    if (value) {
                                        // 根据选中的班级筛选作业
                                        const selectedClassInfo = teacherClasses.find(c => c.id === value);
                                        if (selectedClassInfo) {
                                            // 筛选属于该班级的作业
                                            const filtered = data.filter(homework => {
                                                // 检查作业是否属于选中的班级
                                                return homework.plan?.id === selectedClassInfo.coursePlanId;
                                            });
                                            setFilteredHomeworkList(filtered);
                                            setIsSearching(true);
                                            message.success(`已筛选 ${selectedClassInfo.name} 班级的作业，共 ${filtered.length} 个`);
                                        }
                                    } else {
                                        // 清空筛选，显示所有作业
                                        setFilteredHomeworkList(data);
                                        setIsSearching(false);
                                        message.success('已显示所有班级的作业');
                                    }
                                }}
                                style={{ width: 300, fontWeight: 400 }}
                                allowClear
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {teacherClasses.length > 0 ? (
                                    teacherClasses.map(classItem => (
                                        <Select.Option key={classItem.id} value={classItem.id}>
                                            {classItem.name} ({classItem.courseName})
                                        </Select.Option>
                                    ))
                                ) : (
                                    <Select.Option value="" disabled>
                                        请选择班级
                                    </Select.Option>
                                )}
                            </Select>
                            {selectedClass && (
                                <Button 
                                    size="small" 
                                    onClick={() => {
                                        setSelectedClass('');
                                        setFilteredHomeworkList(data);
                                        setIsSearching(false);
                                        message.success('已清空筛选，显示所有班级的作业');
                                    }}
                                >
                                    清空筛选
                                </Button>
                            )}
                        </div>
                    </Col>
                    <Col span={12}>
                        {selectedClass && (
                            <Tag color="blue">
                                当前查看班级：{teacherClasses.find(c => c.id === selectedClass)?.name} ({teacherClasses.find(c => c.id === selectedClass)?.courseName})
                            </Tag>
                        )}
                    </Col>
                </Row>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <span style={{ color: '#666' }}>统计信息：</span>
                    {getCurrentHomeworkList().length > 0 && (
                        <>
                            <Tag color="purple" style={{ marginLeft: 8 }}>
                                学生总数：{getCurrentHomeworkList().reduce((sum, item) => sum + item.totalStudentCount, 0)} 人
                            </Tag>
                            <Tag color="green" style={{ marginLeft: 8 }}>
                                已提交：{getCurrentHomeworkList().reduce((sum, item) => sum + item.submissionCount, 0)} 人
                            </Tag>
                            <Tag color="orange" style={{ marginLeft: 8 }}>
                                待提交：{getCurrentHomeworkList().reduce((sum, item) => sum + (item.totalStudentCount - item.submissionCount), 0)} 人
                            </Tag>
                            {selectedClass && (
                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                    当前筛选：{teacherClasses.find(c => c.id === selectedClass)?.name}
                                </Tag>
                            )}
                        </>
                    )}
                </div>
                <div>
                    <Space>
                        <Button type="primary" onClick={refreshSubmissions} loading={loading}>
                            刷新数据
                        </Button>
                    </Space>
                </div>
            </div>
            
            <Table
                columns={columns}
                dataSource={getCurrentHomeworkList()}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: getCurrentHomeworkList().length,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10'],
                    onChange: (page, pageSize) => {
                        setCurrentPage(page);
                        setPageSize(pageSize);
                    },
                    showTotal: (total) => `共 ${total} 条${selectedClass ? ` (${teacherClasses.find(c => c.id === selectedClass)?.name} 班级)` : ' (所有班级)'}`,
                }}
                loading={loading}
                rowClassName={() => 'fixed-row'}
                rowKey="id"
            />
            
            <Modal
                title="作业详情"
                open={detailModalVisible}
                onCancel={() => {
                    setDetailModalVisible(false);
                    setStudentAttachments([]);
                    setAttachmentsLoading(false);
                }}
                footer={null}   
                width={800}
            >
                {selectedHomework && (
                    <div>
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="作业名称">
                                {selectedHomework.name}
                            </Descriptions.Item>
                            <Descriptions.Item label="课程名称">
                                {selectedHomework.courseName}
                            </Descriptions.Item>
                            <Descriptions.Item label="创建时间">
                                {selectedHomework.createdAt ? dayjs(selectedHomework.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="截止时间">
                                {selectedHomework.deadline ? dayjs(selectedHomework.deadline).format('YYYY-MM-DD HH:mm:ss') : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="批改进度">
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: '200px', 
                                        height: '10px', 
                                        backgroundColor: '#f0f0f0', 
                                        borderRadius: '5px',
                                        marginRight: '12px'
                                    }}>
                                        <div style={{
                                            width: `${selectedHomework.totalStudentCount > 0 ? (selectedHomework.gradedCount / selectedHomework.totalStudentCount) * 100 : 0}%`,
                                            height: '100%',
                                            backgroundColor: '#52c41a',
                                            borderRadius: '5px',
                                            transition: 'width 0.3s ease'
                                        }}></div>
                                    </div>
                                    <span style={{ fontWeight: 600, color: '#52c41a' }}>
                                        {selectedHomework.totalStudentCount > 0 
                                            ? Math.round((selectedHomework.gradedCount / selectedHomework.totalStudentCount) * 100)
                                            : 0
                                        }%
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    已批改 {selectedHomework.gradedCount} / {selectedHomework.totalStudentCount} 人
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="附件">
                                <div>
                                    {attachmentsLoading ? (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                            正在加载附件信息...
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                                                共 {studentAttachments.length} 个附件
                                            </div>
                                            {studentAttachments.length > 0 ? (
                                                <List
                                                    size="small"
                                                    dataSource={studentAttachments}
                                                    renderItem={(item) => (
                                                        <List.Item>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                                {renderFileLink(item)}
                                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                                    提交者: {item.studentName} | 
                                                                    时间: {dayjs(item.submitTime).format('MM-DD HH:mm')}
                                                                </div>
                                                            </div>
                                                        </List.Item>
                                                    )}
                                                />
                                            ) : (
                                                <span style={{ color: '#999' }}>暂无学生提交附件</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
}
export default Homework;