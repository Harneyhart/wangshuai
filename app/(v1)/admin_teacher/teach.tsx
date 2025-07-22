'use client';

// 教学课件页面(基本完成，但是上传的文件名始终无法添加到页面和数据库中)
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Card, Pagination } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses, getAttachmentsByCoursePlanId, getAllClasses, createClass, deleteClass, createCoursePlan, createHomework, deleteCoursePlan, createAttachment, getSubmissionsByHomeworkId, updateClassById, getAllCoursePlans, deleteCourse, getAllAttachments, deleteAttachment, getCoursePlansForCurrentTeacher } from '@/lib/course/actions';
import { StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, SubmissionsWithRelations, CreateCourseItem } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';
import { SSG_GET_INITIAL_PROPS_CONFLICT } from 'next/dist/lib/constants';
import type { CreateAttachmentItem } from '@/lib/course/actions';
import { LeftCircleFilled } from '@ant-design/icons';


// 扩展 CreateAttachmentItem 类型，添加 id 字段
type AttachmentItemWithId = CreateAttachmentItem & {
    id?: string;
    fileName?: string;
    createdAt?: string;
    fileKey?: string;
    courseName?: string; // 添加课程名称字段
};

const Teach = () => {
    const { modal, message } = App.useApp();

    const formClassRef = useRef<ProFormInstance>();
    const formClassPlanRef = useRef<ProFormInstance>();
    const formHomeworkRef = useRef<ProFormInstance>();
    const formAttachmentRef = useRef<ProFormInstance>();
    const formAddCourse = useRef<ProFormInstance>();

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
    
    // 新增课件相关状态
    const [modalAddteach, setModalAddteach] = useState(false);
    const [modalDeleteteach, setModalDeleteteach] = useState(false);
    const [modalViewAttachment, setModalViewAttachment] = useState(false);
    const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
    const [teachList, setTeachList] = useState<AttachmentItemWithId[]>([]);
    const [selectedTeach, setSelectedTeach] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [coursePlans, setCoursePlans] = useState<any[]>([]);
    const [currentTeacherCoursePlans, setCurrentTeacherCoursePlans] = useState<any[]>([]);
    
    // 新增搜索相关状态
    const [searchText, setSearchText] = useState(''); // 课件名称搜索
    const [searchCourse, setSearchCourse] = useState(''); // 课程名称搜索
    const [filteredTeachList, setFilteredTeachList] = useState<AttachmentItemWithId[]>([]);
    const [isSearching, setIsSearching] = useState(false); // 是否处于搜索状态
    
    const [addTeachForm, setAddTeachForm] = useState<CreateAttachmentItem>({
        name: '',  // 课件名称
        coursePlanId: '',  // 课程计划ID
        submissionId: '',  // 作业ID
        attachments: [],  // 附件
    });
    
    // 添加课程列表状态
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    // 定义表格列
    const columns: ColumnsType<AttachmentItemWithId> = [
        {
            title: '选择',
            dataIndex: 'selection',
            key: 'selection',
            width: 60,
            render: (_, record) => (
                <input
                    type="checkbox"
                    checked={selectedRowKeys.includes(record.id || '')}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setSelectedRowKeys([...selectedRowKeys, record.id || '']);
                        } else {
                            setSelectedRowKeys(selectedRowKeys.filter(key => key !== record.id));
                        }
                    }}
                />
            ),
        },
        {
            title: '课程名称',
            dataIndex: 'courseName',
            render: (text: string, record: AttachmentItemWithId) => {
                // 优先从课程计划关联获取课程名称
                const course = coursePlans.find(plan => plan.id === record.coursePlanId);
                const courseName = course?.course?.name || text || ' ';
                
                if (isSearching && searchCourse && courseName && courseName !== ' ') {
                    // 高亮课程名称搜索关键词
                    const parts = courseName.split(new RegExp(`(${searchCourse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                    return (
                        <span>
                            {parts.map((part: string, index: number) => 
                                part.toLowerCase() === searchCourse.toLowerCase() ? (
                                    <span key={index} style={{ backgroundColor: '#e6f7ff', color: '#1890ff' }}>
                                        {part}
                                    </span>
                                ) : part
                            )}
                        </span>
                    );
                }
                return courseName;
            },
        },
        {
            title: '课件名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => {
                if (isSearching && searchText && text) {
                    // 高亮课件名称搜索关键词
                    const parts = text.split(new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                    return (
                        <span>
                            {parts.map((part: string, index: number) => 
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
        {
            title: '文件名',
            dataIndex: 'fileName',
            key: 'fileName',
        },
        {
            title: '课程计划ID',
            dataIndex: 'coursePlanId',
            key: 'coursePlanId',
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text: string) => text ? new Date(text).toLocaleString() : '-',
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" size="small" onClick={() => handleViewAttachment(record)}>查看</Button>
                    <Button type="link" size="small" danger onClick={() => handleDeleteAttachment(record)}>删除</Button>
                </Space>
            ),
        },
    ];

    // 获取当前教师的课程计划
    const getCurrentTeacherCoursePlans = async () => {
        try {
            const result = await getCoursePlansForCurrentTeacher();
            console.log('当前教师的课程计划:', result);
            
            // 检查是否返回错误
            if (result && typeof result === 'object' && 'error' in result) {
                console.error('获取当前教师课程计划失败:', result.error);
                message.error(result.error);
                return [];
            }
            
            // 确保结果是数组
            const teacherCoursePlans = Array.isArray(result) ? result : [];
            setCurrentTeacherCoursePlans(teacherCoursePlans);
            return teacherCoursePlans;
        } catch (error) {
            console.error('获取当前教师课程计划失败:', error);
            message.error('获取当前教师课程计划失败');
            return [];
        }
    };

    // 获取当前教师相关的课件数据
    const getAttachmentData = async () => {
        try {
            // 先获取当前教师的课程计划
            const teacherCoursePlans = await getCurrentTeacherCoursePlans();
            const teacherCoursePlanIds = teacherCoursePlans.map((plan:any) => plan.id);
            
            console.log('当前教师的课程计划ID:', teacherCoursePlanIds);
            console.log('当前教师的课程计划详情:', teacherCoursePlans);
            
            // 获取所有课件数据
            const attachments = await getAllAttachments();
            console.log('所有课件数据:', attachments);
            
            // 过滤出当前教师相关的课件（只显示通过课程计划关联的，排除学生作业提交的附件）
            const teacherAttachments = attachments.filter((attachment: any) => {
                // 检查是否通过课程计划关联（教师上传的课件）
                const coursePlan = attachment.coursePlansToAttachments?.[0]?.coursePlan;
                const isTeacherAttachment = coursePlan && teacherCoursePlanIds.includes(coursePlan.id);
                
                // 检查是否通过作业提交关联（学生上传的文件）
                const hasSubmissionAttachment = attachment.submissionsToAttachments && attachment.submissionsToAttachments.length > 0;
                
                // 检查是否通过作业提交关联（更严格的检查）
                const isStudentSubmission = attachment.submissionsToAttachments && 
                    attachment.submissionsToAttachments.some((submissionAtt: any) => 
                        submissionAtt.submission && submissionAtt.submission.student
                    );
                
                // 检查是否为学生提交的作业附件（通过检查submission的student字段）
                const isStudentHomeworkAttachment = attachment.submissionsToAttachments && 
                    attachment.submissionsToAttachments.some((submissionAtt: any) => {
                        const submission = submissionAtt.submission;
                        return submission && submission.student && submission.student.user;
                    });
                
                // ★★★ 更简单的判断：只显示通过课程计划关联且没有作业提交关联的附件
                const hasCoursePlanAttachment = attachment.coursePlansToAttachments && attachment.coursePlansToAttachments.length > 0;
                const hasNoSubmissionAttachment = !attachment.submissionsToAttachments || attachment.submissionsToAttachments.length === 0;
                
                console.log(`课件 ${attachment.name}: 课程计划ID=${coursePlan?.id}, 是否属于当前教师=${isTeacherAttachment}, 是否有课程计划关联=${hasCoursePlanAttachment}, 是否有作业提交关联=${hasSubmissionAttachment}, 是否为学生提交=${isStudentSubmission}, 是否为学生作业附件=${isStudentHomeworkAttachment}`);
                
                // 只返回通过课程计划关联且属于当前教师的附件，排除学生作业提交的附件
                // 条件1：必须属于当前教师的课程计划
                // 条件2：必须通过课程计划关联（教师上传的课件）
                // 条件3：不能有作业提交关联（排除学生提交的作业附件）
                const shouldInclude = isTeacherAttachment && hasCoursePlanAttachment && hasNoSubmissionAttachment;
                
                if (shouldInclude) {
                    console.log(`✅ 包含课件: ${attachment.name} (教师上传)`);
                } else {
                    console.log(`❌ 排除附件: ${attachment.name} (原因: 教师附件=${isTeacherAttachment}, 课程计划关联=${hasCoursePlanAttachment}, 无作业关联=${hasNoSubmissionAttachment})`);
                }
                
                return shouldInclude;
            });
            
            console.log('当前教师的课件数据:', teacherAttachments);
            
            const formattedAttachments: AttachmentItemWithId[] = teacherAttachments.map((attachment: any) => {
                // 尝试从课程计划关联获取课程名称
                const coursePlan = attachment.coursePlansToAttachments?.[0]?.coursePlan;
                const courseName = coursePlan?.course?.name || ' ';
                
                return {
                    id: attachment.id,
                    name: attachment.name,
                    coursePlanId: coursePlan?.id || '',
                    courseName: courseName, // 添加课程名称字段
                    attachments: [],
                    fileName: attachment.fileName,
                    createdAt: attachment.createdAt,
                    fileKey: attachment.fileKey
                };
            });
            
            setTeachList(formattedAttachments);
            setFilteredTeachList(formattedAttachments);
            setTotal(formattedAttachments.length);
        } catch (error) {
            console.error('获取课件数据失败:', error);
            message.error('获取课件数据失败');
        }
    };

    // 处理搜索
    const handleSearch = () => {
        const hasAttachmentSearch = searchText.trim();
        const hasCourseSearch = searchCourse.trim();
        
        if (!hasAttachmentSearch && !hasCourseSearch) {
            message.warning('请输入搜索关键词');
            return;
        }
        
        const filtered = teachList.filter(item => {
            let matchesAttachment = true;
            let matchesCourse = true;
            
            // 课件名称搜索（如果有输入）
            if (hasAttachmentSearch) {
                matchesAttachment = item.name?.toLowerCase().includes(searchText.toLowerCase().trim()) || false;
            }
            
            // 课程名称搜索（如果有输入）
            if (hasCourseSearch) {
                matchesCourse = item.courseName?.toLowerCase().includes(searchCourse.toLowerCase().trim()) || false;
            }
            
            // 两个条件都要满足（AND关系）
            return matchesAttachment && matchesCourse;
        });
        
        setFilteredTeachList(filtered);
        setTotal(filtered.length);
        setCurrentPage(1); // 重置到第一页
        setIsSearching(true); // 设置为搜索状态
        
        if (filtered.length === 0) {
            message.info('未找到匹配的课件');
        } else {
            const searchInfo = [];
            if (hasAttachmentSearch) searchInfo.push(`课件名称"${searchText}"`);
            if (hasCourseSearch) searchInfo.push(`课程名称"${searchCourse}"`);
            message.success(`找到 ${filtered.length} 个匹配 ${searchInfo.join(' 和 ')} 的课件`);
        }
    };

    // 清空搜索
    const handleClearSearch = () => {
        setSearchText('');
        setSearchCourse('');
        setFilteredTeachList(teachList);
        setTotal(teachList.length);
        setCurrentPage(1);
        setIsSearching(false); // 清除搜索状态
        message.success('已清空搜索条件');
    };

    // 添加课件
    const handleAddAttachment = async (values: any) => {
        try {
            console.log('提交的表单值:', values);
            
            // 验证必填字段
            if (!values.courseId) {
                message.error('请选择课程');
                return;
            }
            if (!values.coursePlanId) {
                message.error('请选择课程计划');
                return;
            }
            
            // 转换 attachments
            const attachments = (values.attachments || [])
                .filter((file: any) => file.response)
                .map((file: any) => ({
                    name: values.name, // 课件名称，保存到数据库的name字段
                    fileKey: file.response?.data?.fileKey || file.name, // 服务器生成的文件键
                    fileName: file.name, // 原始文件名，保存到数据库的fileName字段
                }));
    
            console.log('转换后的attachments:', attachments);
    
            await createAttachment({
                ...values,
                attachments,
            });
            message.success('添加课件成功，已关联到指定课程');
            setModalAddteach(false);
            getAttachmentData();
            // 如果当前处于搜索状态，重新执行搜索
            if (isSearching && searchText) {
                setTimeout(() => handleSearch(), 100); // 延迟执行确保数据已更新
            }
        } catch (error) {
            console.error('添加课件失败:', error);
            message.error('添加课件失败');
        }
    };

    // 删除课件
    const handleDeleteAttachment = async (record: AttachmentItemWithId) => {
        try {
            modal.confirm({
                title: '确认删除',
                content: `确定要删除课件 "${record.name}" 吗？`,
                onOk: async () => {
                    if (record.id) {
                        await deleteAttachment(record.id);
                        message.success('删除课件成功');
                        getAttachmentData(); // 重新加载数据
                        // 如果当前处于搜索状态，重新执行搜索
                        if (isSearching && searchText) {
                            setTimeout(() => handleSearch(), 100);
                        }
                    } else {
                        message.error('课件ID不存在');
                    }
                },
            });
        } catch (error) {
            console.error('删除课件失败:', error);
            message.error('删除课件失败');
        }
    };

    // 批量删除课件
    const handleBatchDelete = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('请先选择要删除的课件');
            return;
        }

        try {
            modal.confirm({
                title: '确认批量删除',
                content: `确定要删除选中的 ${selectedRowKeys.length} 个课件吗？`,
                onOk: async () => {
                    // 获取选中课件的ID列表
                    const selectedAttachments = teachList.filter(item => selectedRowKeys.includes(item.id || ''));
                    const deletePromises = selectedAttachments.map(attachment => {
                        if (attachment.id) {
                            return deleteAttachment(attachment.id);
                        }
                        return Promise.resolve();
                    });
                    
                    await Promise.all(deletePromises);
                    message.success(`成功删除 ${selectedRowKeys.length} 个课件`);
                    setSelectedRowKeys([]); // 清空选择
                    getAttachmentData(); // 重新加载数据
                    // 如果当前处于搜索状态，重新执行搜索
                    if (isSearching && searchText) {
                        setTimeout(() => handleSearch(), 100);
                    }
                },
            });
        } catch (error) {
            console.error('批量删除课件失败:', error);
            message.error('批量删除课件失败');
        }
    };

    // 查看课件
    const handleViewAttachment = (record: AttachmentItemWithId) => {
        setSelectedAttachment(record);
        setModalViewAttachment(true);
    };

    // 初始化加载数据
    useEffect(() => {
        getAttachmentData();
        // 加载课程计划数据（用于显示课程名称）
        getAllCoursePlans().then(setCoursePlans).catch(console.error);
        // 加载课程数据（用于显示课程名称）
        getAllCourses().then(setCourses).catch(console.error);
    }, []);

    // 初始化过滤列表 - 只在teachList变化时更新，移除searchText依赖以避免实时搜索
    useEffect(() => {
        if (!isSearching) {
            setFilteredTeachList(teachList);
            setTotal(teachList.length);
        }
    }, [teachList, isSearching]);

    return (
        <div style={{ padding: '20px' }}>
           <div style={{ fontSize: 20, fontWeight: 600 }}>教学课件</div>
           
           {/* 操作按钮区域 */}
           <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
               <Button type="primary" onClick={() => setModalAddteach(true)}>添加课件</Button>
               <Button type="primary" danger onClick={handleBatchDelete} disabled={selectedRowKeys.length === 0 }
               >
                   删除课件 ({selectedRowKeys.length})
               </Button>
               {/* <Button 
                   type="default" 
                   onClick={async () => {
                       // 调试：显示所有附件的关联情况
                       const attachments = await getAllAttachments();
                       console.log('所有附件数据:', attachments);
                       
                       const teacherCoursePlans = await getCurrentTeacherCoursePlans();
                       const teacherCoursePlanIds = teacherCoursePlans.map((plan:any) => plan.id);
                       
                       attachments.forEach((attachment: any) => {
                           const coursePlan = attachment.coursePlansToAttachments?.[0]?.coursePlan;
                           const isTeacherAttachment = coursePlan && teacherCoursePlanIds.includes(coursePlan.id);
                           const hasCoursePlanAttachment = attachment.coursePlansToAttachments && attachment.coursePlansToAttachments.length > 0;
                           const hasSubmissionAttachment = attachment.submissionsToAttachments && attachment.submissionsToAttachments.length > 0;
                           
                           console.log(`附件 "${attachment.name}":`, {
                               id: attachment.id,
                               isTeacherAttachment,
                               hasCoursePlanAttachment,
                               hasSubmissionAttachment,
                               coursePlanId: coursePlan?.id,
                               courseName: coursePlan?.course?.name,
                               className: coursePlan?.class?.name
                           });
                       });
                       
                       message.info(`共有 ${attachments.length} 个附件，当前显示 ${teachList.length} 个教师课件`);
                   }}
               >
                   调试：查看附件关联
               </Button> */}
           </div>

           {/* 课件列表显示区域 */}
           <div style={{ marginBottom: '20px' }}>
               {filteredTeachList.length === 0 ? (
                   <div style={{ 
                       textAlign: 'center', 
                       padding: '40px', 
                       backgroundColor: '#fafafa', 
                       borderRadius: '8px',
                       color: '#999'
                   }}>
                       {isSearching && (searchText || searchCourse) ? 
                           (() => {
                               const searchTerms = [];
                               if (searchText) searchTerms.push(`课件名称"${searchText}"`);
                               if (searchCourse) searchTerms.push(`课程名称"${searchCourse}"`);
                               return `未找到匹配 ${searchTerms.join(' 和 ')} 的课件，请尝试其他关键词`;
                           })() : 
                           '暂无课件，请点击"添加课件"添加新课件'
                       }
                   </div>
               ) : (
                   <div>

                   <div style={{ fontSize: 16, fontWeight: 600, marginBottom: '10px' }}>
                   课件列表 ({filteredTeachList.length})
                   {isSearching && (searchText || searchCourse) && (
                       <span style={{ color: '#1890ff', fontSize: '14px', fontWeight: 'normal' }}>
                           {` - 搜索结果`}
                       </span>
                   )}
               </div>
               <div style={{ 
               marginBottom: '20px', 
               padding: '16px', 
               backgroundColor: '#fafafa', 
               borderRadius: '8px',
               border: '1px solid #d9d9d9'
           }}>
               <Row gutter={[16, 16]} align="middle">
                   <Col span={6}>
                       <div style={{ marginBottom: '4px', fontWeight: '500', color: '#666' }}>课件名称搜索</div>
                       <Input 
                           placeholder="请输入课件名称..."
                           value={searchText}
                           onChange={(e) => setSearchText(e.target.value)}
                           onPressEnter={() => handleSearch()}
                           allowClear
                       />
                   </Col>
                   <Col span={6}>
                       <div style={{ marginBottom: '4px', fontWeight: '500', color: '#666' }}>课程名称搜索</div>
                       <Input 
                           placeholder="请输入课程名称..."
                           value={searchCourse}
                           onChange={(e) => setSearchCourse(e.target.value)}
                           onPressEnter={() => handleSearch()}
                           allowClear
                       />
                   </Col>
                   <Col span={6}>
                       <div style={{ marginBottom: '4px' }}>&nbsp;</div>
                       <Space>
                           <Button 
                               type="primary" 
                               onClick={() => handleSearch()}
                               disabled={!searchText.trim() && !searchCourse.trim()}
                           >
                               搜索
                           </Button>
                           <Button 
                               onClick={handleClearSearch}
                               disabled={!isSearching && !searchText.trim() && !searchCourse.trim()}
                           >
                               清空
                           </Button>
                       </Space>
                   </Col>
                   <Col span={6}>
                       <div style={{ marginBottom: '4px' }}>&nbsp;</div>
                       {isSearching && (searchText || searchCourse) && (
                           <Tag color="blue">
                               搜索结果: {filteredTeachList.length} 个课件
                           </Tag>
                       )}
                   </Col>
               </Row>
           </div>
                    
                    <Table
                        columns={columns}
                        dataSource={filteredTeachList}
                        rowKey="id"
                        pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            total: total,
                            showSizeChanger: false,
                            showQuickJumper: true,
                            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                            onChange: (page, size) => {
                                setCurrentPage(page);
                                setPageSize(size);
                            },
                            pageSizeOptions: ['10'],
                            showLessItems: false,
                        }}
                    />
                </div>
            )}
           </div>

           {/* 添加课件模态框 */}
           <ModalForm<CreateAttachmentItem>
               {...formConfig}
               title="添加课件"
               formRef={formAttachmentRef}
               open={modalAddteach}
               onOpenChange={(open) => {
                   setModalAddteach(open);
                   if (!open) {
                       // 关闭时重置状态
                       setSelectedCourseId('');
                   }
               }}
               onFinish={handleAddAttachment}
               initialValues={addTeachForm}
           >
               <ProFormText
                   width="md"
                   name="name"
                   required
                   label="课件名称"
                   placeholder="请输入课件名称"
               />
               <ProFormSelect
                   label="选择课程"
                   width="md"
                   required
                   showSearch={true}
                   options={(() => {
                       // 从当前教师的课程计划中提取课程
                       const teacherCourses = Array.from(
                           new Map(
                               currentTeacherCoursePlans.map(plan => [plan.course.id, plan.course])
                           ).values()
                       );
                       return teacherCourses.map((course) => ({
                           value: course.id,
                           label: course.name,
                       }));
                   })()}
                   name="courseId"
                   placeholder="请选择课程（必填）"
                   fieldProps={{
                       onChange: (value: string) => {
                           setSelectedCourseId(value);
                           // 清空课程计划选择
                           formAttachmentRef.current?.setFieldValue('coursePlanId', undefined);
                       }
                   }}
               />
               <ProFormSelect
                   label="选择课程计划"
                   width="md"
                   required
                   showSearch={true}
                   dependencies={['courseId']}
                   request={async (params) => {
                       // 只显示当前教师的课程计划
                       const teacherPlans = currentTeacherCoursePlans;
                       // 根据选择的课程过滤课程计划
                       const filteredPlans = selectedCourseId ? 
                           teacherPlans.filter(plan => plan.course.id === selectedCourseId) : 
                           teacherPlans;
                       return filteredPlans.map((plan) => ({
                           value: plan.id,
                           label: `${plan.course.name} - ${plan.class.name}`,
                       }));
                   }}
                   name="coursePlanId"
                   placeholder={selectedCourseId ? "请选择课程计划" : "请先选择课程"}
                   disabled={!selectedCourseId}
               />
               <ProFormUploadDragger
                   width="md"
                   label="课件文件"
                   name="attachments"
                   max={5}
                   fieldProps={{
                       name: 'file',
                   }}
                   action="/api/upload"
                   extra="支持 PDF、Word、PPT、Excel、图片、视频、音频、压缩包等格式"
               />
           </ModalForm>

           {/* 查看课件模态框 */}
           <Modal
               title="查看课件"
               open={modalViewAttachment}
               onCancel={() => setModalViewAttachment(false)}
               footer={[
                   <Button key="close" onClick={() => setModalViewAttachment(false)}>
                       关闭
                   </Button>
               ]}
               width={800}
           >
               {selectedAttachment && (
                   <div>
                       <div style={{ marginBottom: '16px' }}>
                           <Typography.Title level={4}>{selectedAttachment.name}</Typography.Title>
                       </div>
                       
                       <div style={{ marginBottom: '16px' }}>
                           <Typography.Text strong>文件名：</Typography.Text>
                           <Typography.Text>{selectedAttachment.fileName}</Typography.Text>
                       </div>
                       
                       <div style={{ marginBottom: '16px' }}>
                           <Typography.Text strong>课程计划ID：</Typography.Text>
                           <Typography.Text>{selectedAttachment.coursePlanId}</Typography.Text>
                       </div>
                       
                       <div style={{ marginBottom: '16px' }}>
                           <Typography.Text strong>创建时间：</Typography.Text>
                           <Typography.Text>
                               {selectedAttachment.createdAt ? new Date(selectedAttachment.createdAt).toLocaleString() : '-'}
                           </Typography.Text>
                       </div>
                       
                       <div style={{ marginBottom: '16px' }}>
                           <Typography.Text strong>课件预览：</Typography.Text>
                           <div style={{ marginTop: '8px' }}>
                               {selectedAttachment.fileName && (
                                   <div>
                                       {selectedAttachment.fileName.toLowerCase().endsWith('.pdf') ? (
                                           <iframe
                                               src={`/api/attachment/view?key=${selectedAttachment.fileKey}`}
                                               width="100%"
                                               height="500px"
                                               style={{ border: '1px solid #d9d9d9', borderRadius: '6px' }}
                                           />
                                       ) : selectedAttachment.fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp)$/i) ? (
                                           <img
                                               src={`/api/attachment/view?key=${selectedAttachment.fileKey}`}
                                               alt={selectedAttachment.name}
                                               style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '6px' }}
                                           />
                                       ) : (
                                           <div style={{ 
                                               padding: '20px', 
                                               textAlign: 'center', 
                                               backgroundColor: '#f5f5f5', 
                                               borderRadius: '6px',
                                               border: '1px solid #d9d9d9'
                                           }}>
                                               <Typography.Text>此文件类型不支持预览</Typography.Text>
                                               <br />
                                               <Button 
                                                   type="primary" 
                                                   style={{ marginTop: '8px' }}
                                                   onClick={() => window.open(`/api/attachment/view?key=${selectedAttachment.fileKey}`, '_blank')}
                                               >
                                                   下载查看
                                               </Button>
                                           </div>
                                       )}
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>
               )}
           </Modal>
        </div>
    );
}
export default Teach;