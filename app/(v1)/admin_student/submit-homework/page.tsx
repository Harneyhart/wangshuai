'use client';

// 学生提交作业页面
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Form, 
    Input, 
    Button, 
    Upload, 
    message, 
    Card, 
    Descriptions, 
    Space, 
    Modal,
    Typography,
    Divider 
} from 'antd';
import { UploadOutlined, ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { createSubmission } from '@/lib/course/actions';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface HomeworkInfo {
    key: string;
    homework: string;
    courseName: string;
    className: string;
    description: string;
    publishTime: string;
    deadline: string;
    status: string;
    studentName?: string;
    attachments?: Array<{
        id: string;
        name: string;
        fileName: string;
        fileKey: string;
    }>;
}

const SubmitHomework = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [form] = Form.useForm();
    
    const [homeworkInfo, setHomeworkInfo] = useState<HomeworkInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [submitModalVisible, setSubmitModalVisible] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<any>(null);

    // 从URL参数获取作业基本信息，然后从数据库获取完整信息（包括附件）
    useEffect(() => {
        const homeworkKey = searchParams.get('key');
        if (homeworkKey) {
            // 先设置基本信息
            const basicInfo: HomeworkInfo = {
                key: homeworkKey,
                homework: searchParams.get('homework') || '',
                courseName: searchParams.get('courseName') || '',
                className: searchParams.get('className') || '',
                description: searchParams.get('description') || '',
                publishTime: searchParams.get('publishTime') || '',
                deadline: searchParams.get('deadline') || '',
                status: searchParams.get('status') || '',
            };
            setHomeworkInfo(basicInfo);

            // 从数据库获取完整的作业信息（包括附件）
            const fetchHomeworkDetail = async () => {
                try {
                    const response = await fetch(`/api/student/homework/${homeworkKey}`);
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                            const fullInfo = {
                                ...basicInfo,
                                attachments: result.data.attachments || [],
                            };
                            setHomeworkInfo(fullInfo);
                        }
                    }
                } catch (error) {
                    console.error('获取作业详情失败:', error);
                    // 如果获取失败，保持基本信息不变
                }
            };

            fetchHomeworkDetail();
        }
    }, [searchParams]);

    // 页面加载时获取学生信息
    useEffect(() => {
        const fetchStudentInfo = async () => {
            try {
                const response = await fetch('/api/student/current');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        setCurrentStudent(result.data);
                        form.setFieldsValue({ studentName: result.data.name });
                        console.log('获取到学生信息:', result.data);
                    }
                } else {
                    console.error('获取学生信息失败:', response.status);
                    // 不设置访问拒绝，因为可能是API问题而不是权限问题
                }
            } catch (error) {
                console.error('获取学生信息失败:', error);
                // 不设置访问拒绝，因为可能是网络问题而不是权限问题
            }
        };
        fetchStudentInfo();
    }, [form]);



    // 文件上传配置
    const uploadProps: UploadProps = {
        name: 'file',
        multiple: true,
        fileList,
        action: '/api/upload', // 添加上传地址
        beforeUpload: (file) => {
            const isLt50M = file.size / 1024 / 1024 < 50;
            if (!isLt50M) {
                message.error('文件大小不能超过50MB!');
                return false;
            } 
            return true; // 允许上传到服务器
        },
        onChange: ({ fileList: newFileList }) => {
            setFileList(newFileList);
        },
        onRemove: (file) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
    };

    // 提交作业
    const handleSubmit = async (values: any) => {
        if (!values.content && fileList.length === 0) {
            message.warning('请输入作业内容或上传作业文件');
            return;
        }

        setSubmitModalVisible(true);
    };

    // 确认提交
    const confirmSubmit = async () => {
        try {
            setLoading(true);
            
            const submissionData = {
                homeworkId: homeworkInfo?.key || '',
                text: form.getFieldValue('content') || '',
                attachments: fileList.length > 0 ? parseUploadFileToUpsertUploadFile(fileList) : undefined,
            };

            await createSubmission(submissionData);
            
            // 获取学生姓名 - 优先使用表单输入，然后尝试API
            let studentName = form.getFieldValue('studentName') || '当前学生';
            
            // 如果表单中没有输入姓名，尝试从API获取
            if (!form.getFieldValue('studentName')) {
                try {
                    console.log('正在从API获取学生姓名...');
                    const response = await fetch('/api/student/current');
                    console.log('API响应状态:', response.status);
                    if (response.ok) {
                        const result = await response.json();
                        console.log('API响应数据:', result);
                        if (result.success && result.data?.name) {
                            studentName = result.data.name;
                            console.log('从API获取到学生姓名:', studentName);
                        }
                    }
                } catch (error) {
                    console.error('API获取学生姓名失败:', error);
                }
            } else {
                console.log('使用表单输入的学生姓名:', studentName);
            }
            
            // 保存提交记录到localStorage
            const submissions = JSON.parse(localStorage.getItem('studentSubmissions') || '[]');
            const newSubmission = {
                homeworkKey: homeworkInfo?.key,
                homework: homeworkInfo?.homework,
                courseName: homeworkInfo?.courseName,
                className: homeworkInfo?.className,
                studentName: studentName,
                submitTime: new Date().toISOString(),
                description: form.getFieldValue('content') || '',
                files: fileList.map(file => file.name),
                id: Date.now().toString(),
            };
            submissions.push(newSubmission);
            localStorage.setItem('studentSubmissions', JSON.stringify(submissions));
            
            // 同时更新教师端的提交数据供批改使用
            const teacherSubmissions = JSON.parse(localStorage.getItem('teacherSubmissions') || '[]');
            const teacherSubmission = {
                ...newSubmission,
                key: newSubmission.id,
                score: null,
                comment: null,
                status: '未评分'
            };
            teacherSubmissions.push(teacherSubmission);
            localStorage.setItem('teacherSubmissions', JSON.stringify(teacherSubmissions));
            
            message.success('作业提交成功！如有需要，您可以随时重新提交更新内容。');
            setSubmitModalVisible(false);
            
            // 返回作业列表页面
            router.back();
            
        } catch (error) {
            console.error('提交作业失败:', error);
            message.error('提交作业失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 返回按钮
    const handleBack = () => {
        router.back();
    };
    

    // 检查是否临近截止时间
    const isNearDeadline = () => {
        if (!homeworkInfo?.deadline) return false;
        const deadline = new Date(homeworkInfo.deadline);
        const now = new Date();
        const timeDiff = deadline.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);
        return hoursDiff <= 24 && hoursDiff > 0; // 24小时内
    };

    const isOverdue = () => {
        if (!homeworkInfo?.deadline) return false;
        const deadline = new Date(homeworkInfo.deadline);
        const now = new Date();
        return now > deadline;
    };

    if (!homeworkInfo) {
        return <div style={{ padding: 24 }}>加载中...</div>;
    }



    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
            {/* 页面头部 */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Title style={{ fontSize: 30, fontWeight: 500, marginBottom: '4px', margin: 0 }}>提交作业</Title>
                <Button 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => router.back()}
                    
                >
                    返回
                </Button>
            </div>

            {/* 作业信息卡片 */}
            <Card 
                title="作业信息" 
                style={{ marginBottom: 24 }}
                headStyle={{ backgroundColor: '#f5f5f5' }}
            >
                <Descriptions column={2} bordered>
                    <Descriptions.Item label="作业名称" span={2}>
                        <strong style={{ fontSize: 16 }}>{homeworkInfo.homework}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="课程名称">
                        {homeworkInfo.courseName}
                    </Descriptions.Item>
                    <Descriptions.Item label="班级">
                        {homeworkInfo.className}
                    </Descriptions.Item>
                    <Descriptions.Item label="发布时间">
                        {homeworkInfo.publishTime ? 
                            new Date(homeworkInfo.publishTime).toLocaleString() : '-'
                        }
                    </Descriptions.Item>
                    <Descriptions.Item label="截止时间">
                        <span style={{ 
                            color: isOverdue() ? '#ff4d4f' : isNearDeadline() ? '#fa8c16' : '#000'
                        }}>
                            {homeworkInfo.deadline ? 
                                new Date(homeworkInfo.deadline).toLocaleString() : '-'
                            }
                            {isOverdue() && <span style={{ marginLeft: 8 }}>⚠️ 已超时</span>}
                            {!isOverdue() && isNearDeadline() && <span style={{ marginLeft: 8 }}>⏰ 即将截止</span>}
                        </span>
                    </Descriptions.Item>
                    {homeworkInfo.description && (
                        <Descriptions.Item label="作业描述" span={2}>
                            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                {homeworkInfo.description}
                            </Paragraph>
                        </Descriptions.Item>
                    )}
                    {homeworkInfo.attachments && homeworkInfo.attachments.length > 0 && (
                        <Descriptions.Item label="作业附件" span={2}>
                            <div style={{ marginTop: '8px' }}>
                                <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', marginBottom: '12px' }}>
                                    <Typography.Text type="secondary" style={{ fontSize: '14px' }}>
                                        📋 教师提供的作业材料和要求，请仔细查看后完成作业
                                    </Typography.Text>
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {homeworkInfo.attachments.map((attachment, index) => (
                                        <div key={index} style={{ 
                                            padding: '12px', 
                                            border: '1px solid #d9d9d9', 
                                            borderRadius: '8px', 
                                            marginBottom: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: '#fafafa',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500, color: '#1890ff', marginBottom: '4px' }}>
                                                    📎 {attachment.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                    文件名: {attachment.fileName}
                                                </div>
                                            </div>
                                            <Space>
                                                <Button 
                                                    size="small" 
                                                    type="primary"
                                                    onClick={() => window.open(`/api/attachment/view?key=${attachment.fileKey}`, '_blank')}
                                                >
                                                    预览
                                                </Button>
                                                <Button 
                                                    size="small"
                                                    onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = `/api/attachment/view?key=${attachment.fileKey}&download=1`;
                                                        link.download = attachment.fileName;
                                                        link.click();
                                                    }}
                                                >
                                                    下载
                                                </Button>
                                            </Space>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Card>

            {/* 提交表单 */}
            <Card 
                title="提交作业" 
                headStyle={{ backgroundColor: '#f5f5f5' }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        label="学生姓名"
                        name="studentName"
                        rules={[{ required: true, message: '请输入您的姓名' }]}
                        tooltip="请输入您的真实姓名，用于教师批改时识别"
                    >
                        <Input
                            placeholder="请输入您的真实姓名"
                            style={{ width: '300px' }}
                        />
                    </Form.Item>

                    <Form.Item
                        label="作业内容"
                        name="content"
                        rules={[
                            {
                                validator: (_, value) => {
                                    if (!value && fileList.length === 0) {
                                        return Promise.reject('请输入作业内容或上传作业文件');
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <TextArea
                            rows={8}
                            placeholder="请输入您的作业内容..."
                            showCount
                            maxLength={5000}
                        />
                    </Form.Item>

                    <div style={{ 
                        marginBottom: 16, 
                        padding: '12px', 
                        backgroundColor: '#f0f9ff', 
                        border: '1px solid #91d5ff',
                        borderRadius: '6px' 
                    }}>
                        <p style={{ margin: 0, color: '#1890ff', fontSize: '14px' }}>
                            💡 <strong>温馨提示：</strong>您可以多次提交作业，系统会保留最新的提交内容。如需修改已提交的作业，直接重新提交即可。
                        </p>
                    </div>

                    <Form.Item label="上传文件">
                        <Upload.Dragger {...uploadProps}>
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined />
                            </p>
                            <p className="ant-upload-text">
                                点击或拖拽文件到此区域进行上传
                            </p>
                            <p className="ant-upload-hint">
                                支持单个或批量上传，文件大小不超过50MB
                            </p>
                        </Upload.Dragger>
                    </Form.Item>

                    {isOverdue() && (
                        <div style={{ 
                            padding: 16, 
                            backgroundColor: '#fff7e6', 
                            border: '1px solid #ffd591',
                            borderRadius: 6,
                            marginBottom: 16
                        }}>
                            <p style={{ color: '#fa8c16', margin: 0 }}>
                                ⚠️ 该作业已超过截止时间，提交将标记为迟交
                            </p>
                        </div>
                    )}

                    <Form.Item>
                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                icon={<CheckOutlined />}
                                size="large"
                            >
                                提交作业
                            </Button>
                            <Button size="large" onClick={() => router.back()}>
                                取消
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>

            {/* 提交确认弹窗 */}
            <Modal
                title="确认提交作业"
                open={submitModalVisible}
                onOk={confirmSubmit}
                onCancel={() => setSubmitModalVisible(false)}
                confirmLoading={loading}
                okText="确认提交"
                cancelText="取消"
            >
                <div>
                    <p><strong>学生姓名：</strong>{form.getFieldValue('studentName') || '未填写'}</p>
                    <p><strong>作业名称：</strong>{homeworkInfo.homework}</p>
                    <p><strong>课程：</strong>{homeworkInfo.courseName}</p>
                    <p><strong>内容长度：</strong>{form.getFieldValue('content')?.length || 0} 字</p>
                    <p><strong>上传文件：</strong>{fileList.length} 个</p>
                    <Divider />
                    {isOverdue() ? (
                        <p style={{ color: '#fa8c16' }}>
                            ⚠️ 作业已超时，提交后将标记为迟交。如有需要，您可以重新提交覆盖之前的内容。
                        </p>
                    ) : (
                        <p style={{ color: '#1890ff' }}>
                            💡 提示：您可以重复提交作业，新的提交内容将覆盖之前的版本。
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default SubmitHomework; 