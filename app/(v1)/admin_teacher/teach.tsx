'use client';

// 教学课件页面(基本完成，但是上传的文件名始终无法添加到页面和数据库中)
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type{ ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormSelect, ProFormText, ProFormRadio, ProFormUploadDragger, ProFormTextArea } from '@ant-design/pro-components';
import { App, Col, Row, Space, Popconfirm, message, Button, Table, Tag, Modal, Form, Input, Select, Upload, Typography, Divider, Card, Pagination } from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getAllStudents, getAllCourses, getAttachmentsByCoursePlanId, getAllClasses, createClass, deleteClass, createCoursePlan, createHomework, deleteCoursePlan, createAttachment, getSubmissionsByHomeworkId, updateClassById, getAllCoursePlans, deleteCourse, getAllAttachments, deleteAttachment } from '@/lib/course/actions';
import { UserItem, StudentsWithUser, CoursesWithPlan, CreateClassItem, UpdateClassItem, ClassesWithStudents, CreateCoursePlanItem, CreateHomeworkItem, SubmissionsWithRelations, CreateCourseItem } from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';
import { SSG_GET_INITIAL_PROPS_CONFLICT } from 'next/dist/lib/constants';
import type { CreateAttachmentItem } from '@/lib/course/actions';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';

// 扩展 CreateAttachmentItem 类型，添加 id 字段
type AttachmentItemWithId = CreateAttachmentItem & {
    id?: string;
    fileName?: string;
    createdAt?: string;
    fileKey?: string;
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
    
    // 新增搜索相关状态
    const [searchText, setSearchText] = useState('');
    const [searchType, setSearchType] = useState('name'); // name, fileName, coursePlanId, createdAt
    const [filteredTeachList, setFilteredTeachList] = useState<AttachmentItemWithId[]>([]);
    
    const [addTeachForm, setAddTeachForm] = useState<CreateAttachmentItem>({
        name: '',  // 课件名称
        coursePlanId: '',  // 课程计划ID
        submissionId: '',  // 作业ID
        attachments: [],  // 附件
    });

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
            title: '课件名称',
            dataIndex: 'name',
            key: 'name',
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

    // 获取所有课件数据
    const getAttachmentData = async () => {
        try {
            const attachments = await getAllAttachments();
            console.log('最新课件数据:', attachments);
            const formattedAttachments: AttachmentItemWithId[] = attachments.map((attachment: any) => ({
                id: attachment.id,
                name: attachment.name,
                coursePlanId: attachment.coursePlansToAttachments?.[0]?.coursePlan?.id || '',
                attachments: [],
                fileName: attachment.fileName,
                createdAt: attachment.createdAt,
                fileKey: attachment.fileKey
            }));
            
            setTeachList(formattedAttachments);
            setFilteredTeachList(formattedAttachments);
            setTotal(formattedAttachments.length);
        } catch (error) {
            console.error('获取课件数据失败:', error);
            message.error('获取课件数据失败');
        }
    };

    // 搜索过滤函数
    const filterAttachments = (list: AttachmentItemWithId[], searchValue: string, type: string) => {
        if (!searchValue.trim()) {
            return list;
        }

        return list.filter(item => {
            const searchLower = searchValue.toLowerCase();
            
            switch (type) {
                case 'name':
                    return item.name?.toLowerCase().includes(searchLower);
                case 'fileName':
                    return item.fileName?.toLowerCase().includes(searchLower);
                case 'coursePlanId':
                    return item.coursePlanId?.toLowerCase().includes(searchLower);
                case 'createdAt':
                    if (item.createdAt) {
                        const dateStr = new Date(item.createdAt).toLocaleString();
                        return dateStr.toLowerCase().includes(searchLower);
                    }
                    return false;
                default:
                    return true;
            }
        });
    };

    // 处理搜索
    const handleSearch = () => {
        const filtered = filterAttachments(teachList, searchText, searchType);
        setFilteredTeachList(filtered);
        setTotal(filtered.length);
        setCurrentPage(1); // 重置到第一页
    };

    // 清空搜索
    const handleClearSearch = () => {
        setSearchText('');
        setSearchType('name');
        setFilteredTeachList(teachList);
        setTotal(teachList.length);
        setCurrentPage(1);
    };

    // 添加课件
    const handleAddAttachment = async (values: any) => {
        try {
            console.log('attachments:', values.attachments);
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
            message.success('添加课件成功');
            setModalAddteach(false);
            getAttachmentData();
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
    }, []);

    return (
        <div style={{ padding: '20px' }}>
           <h2>教学课件</h2>
           <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <Button type="primary" onClick={() => setModalAddteach(true)}>添加课件</Button>
            <Button 
                type="primary" 
                danger 
                onClick={handleBatchDelete}
                disabled={selectedRowKeys.length === 0}
            >
                删除课件 ({selectedRowKeys.length})
            </Button>
           </div>
           <div style={{ marginBottom: '20px' }}>
            <h3>课件列表 ({filteredTeachList.length})</h3>
            {filteredTeachList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fafafa', borderRadius: '8px', color: '#999' }}>
                    {searchText ? '没有找到匹配的课件' : '暂无课件，请点击"添加课件"添加新课件'}
                </div>
            ) : (
                <div>
                    {/* 搜索栏 */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginBottom: '16px',
                        padding: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                    }}>
                        <Typography.Text strong>搜索：</Typography.Text>
                        <Select
                            value={searchType}
                            onChange={setSearchType}
                            style={{ width: 120 }}
                            options={[
                                { value: 'name', label: '课件名称' },
                                { value: 'fileName', label: '文件名' },
                                { value: 'coursePlanId', label: '课程计划ID' },
                                { value: 'createdAt', label: '创建时间' },
                            ]}
                        />
                        <Input
                            placeholder={`请输入${searchType === 'name' ? '课件名称' : searchType === 'fileName' ? '文件名' : searchType === 'coursePlanId' ? '课程计划ID' : '创建时间'}进行搜索`}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 300 }}
                            onPressEnter={handleSearch}
                            suffix={
                                <Space>
                                    {searchText && (
                                        <ClearOutlined 
                                            onClick={handleClearSearch}
                                            style={{ cursor: 'pointer', color: '#999' }}
                                        />
                                    )}
                                    <SearchOutlined 
                                        onClick={handleSearch}
                                        style={{ cursor: 'pointer', color: '#1890ff' }}
                                    />
                                </Space>
                            }
                        />
                        <Button type="primary" onClick={handleSearch}>
                            搜索
                        </Button>
                        {searchText && (
                            <Button onClick={handleClearSearch}>
                                清空
                            </Button>
                        )}
                    </div>

                    {/* 自定义分页控制 */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button 
                                size="small"
                                onClick={() => {
                                    if (selectedRowKeys.length === filteredTeachList.length) {
                                        setSelectedRowKeys([]);
                                    } else {
                                        const allIds = filteredTeachList.map(item => item.id || '').filter(id => id !== '');
                                        setSelectedRowKeys(allIds);
                                    }
                                }}
                            >
                                {selectedRowKeys.length === filteredTeachList.length ? '取消全选' : '全选'}
                            </Button>
                            <Typography.Text>
                                已选择 {selectedRowKeys.length} 项
                            </Typography.Text>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Typography.Text>跳转到：</Typography.Text>
                            <Input
                                style={{ width: 80 }}
                                placeholder="页码"
                                onPressEnter={(e) => {
                                    const page = parseInt((e.target as HTMLInputElement).value);
                                    if (page && page > 0 && page <= Math.ceil(total / pageSize)) {
                                        setCurrentPage(page);
                                    } else {
                                        message.error('请输入有效的页码');
                                    }
                                }}
                            />
                            <Button 
                                type="primary" 
                                size="small"
                                onClick={() => {
                                    const input = document.querySelector('input[placeholder="页码"]') as HTMLInputElement;
                                    if (input) {
                                        const page = parseInt(input.value);
                                        if (page && page > 0 && page <= Math.ceil(total / pageSize)) {
                                            setCurrentPage(page);
                                        } else {
                                            message.error('请输入有效的页码');
                                        }
                                    }
                                }}
                            >
                                跳转
                            </Button>
                            <Typography.Text>页</Typography.Text>
                            <Typography.Text style={{ marginLeft: '16px' }}>
                                共 {Math.ceil(total / pageSize)} 页
                            </Typography.Text>
                        </div>
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
               onOpenChange={setModalAddteach}
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
                   label="选择课程计划"
                   width="md"
                   required
                   showSearch={false}
                   request={async () => {
                       const data = await getAllCoursePlans();
                       return data.map((plan) => ({
                           value: plan.id,
                           label: `${plan.course.name} - ${plan.class.name}`,
                       }));
                   }}
                   name="coursePlanId"
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