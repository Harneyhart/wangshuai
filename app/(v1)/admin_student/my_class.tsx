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
        const fetchStudentClasses = async () => {
            setLoading(true);
            try {
                const result = await getClassesForStudent();
                if (Array.isArray(result)) {
                    setClassData(result);
                } else if (result.error) {
                    message.error(result.error);
                }
            } catch (error) {
                console.error('获取学生课程失败:', error);
                message.error('获取课程数据失败');
            }
            setLoading(false);
        };

        fetchStudentClasses();
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
            title: '班级名称',
            dataIndex: 'className',
            key: 'className',
            width: 150,
            align: 'center',
        },
        {
            title: '课程列表',
            dataIndex: 'courses',
            key: 'courses',
            width: 200,
            align: 'center',
            ellipsis: true,
            render: (text: string) => text && text.trim() ? text : '暂无课程',
        },
        {
            title: '学生人数',
            dataIndex: 'studentCount',
            key: 'studentCount',
            width: 100,
            align: 'center',
        },
        {
            title: '创建时间',
            dataIndex: 'createTime',
            key: 'createTime',
            width: 150,
            align: 'center',
            render: (text: string) => text ? new Date(text).toLocaleDateString() : '-',
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
        <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <div style={{ marginBottom: 16 }}>
                <h2>我的课程</h2>
                <p style={{ color: '#666', fontSize: 14 }}>
                    这里显示您所在班级的所有课程信息，教师添加或删除课程时会自动同步更新。
                </p>
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
                    showTotal: (total) => `共 ${total} 个班级`,
                }}
                rowKey="key"
            />

            {/* 课程详情弹窗 */}
            <Modal
                title="课程详情"
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={600} 
            >
                {selectedClass && (
                    <div>
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="班级名称">
                                {selectedClass.className}
                            </Descriptions.Item>className
                            <Descriptions.Item label="课程列表">
                                {selectedClass.courses || '暂无课程'}
                            </Descriptions.Item>
                            <Descriptions.Item label="学生人数">
                                {selectedClass.studentCount} 人
                            </Descriptions.Item>
                            <Descriptions.Item label="创建时间">
                                {selectedClass.createTime ? new Date(selectedClass.createTime).toLocaleString() : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="更新时间">
                                {selectedClass.updateTime ? new Date(selectedClass.updateTime).toLocaleString() : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Classlist;
