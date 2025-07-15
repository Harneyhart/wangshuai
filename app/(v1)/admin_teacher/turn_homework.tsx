'use client';

// 作业批改页面
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { App, Col, Row, Space, message, Button, Table, Tag, Modal, Input, Typography, Descriptions } from 'antd';
import { getAllSubmissions } from '@/lib/course/actions';
import { SubmissionsWithRelations } from '@/lib/course/actions';
import { useRouter } from 'next/navigation';

// 使用数据库返回的SubmissionsWithRelations类型
type HomeworkSubmission = SubmissionsWithRelations;

// 作业数据类型（去重后的）
type HomeworkItem = {
    id: string;
    name: string;
    courseName: string;
    submissionCount: number;
    gradedCount: number;
    plan: any;
    deadline?: string;
    createdAt?: string;
};

const Homework = () => {
    const { message } = App.useApp();
    const router = useRouter();

    // 搜索相关状态
    const [searchText, setSearchText] = useState('');
    const [filteredHomeworkList, setFilteredHomeworkList] = useState<HomeworkItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 作业相关状态
    const [selectedHomework, setSelectedHomework] = useState<any>(null);
    const [data, setData] = useState<HomeworkItem[]>([]);
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 作业详情弹窗状态
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    // 从数据库读取学生提交的作业数据并处理为去重的作业列表
    useEffect(() => {
        const loadHomeworkData = async () => {
            try {
                setLoading(true);
                console.log('开始加载作业数据...');
                const submissions = await getAllSubmissions();
                console.log('获取到的作业提交数据:', submissions);
                
                // 按作业ID去重，统计每个作业的提交情况
                const homeworkMap = new Map<string, HomeworkItem>();
                
                submissions.forEach(submission => {
                    const homeworkId = submission.homework?.id;
                    if (!homeworkId) return;
                    
                    if (!homeworkMap.has(homeworkId)) {
                        homeworkMap.set(homeworkId, {
                            id: homeworkId,
                            name: submission.homework?.name || '未命名作业',
                            courseName: submission.homework?.plan?.course?.name || '未知课程',
                            submissionCount: 0,
                            gradedCount: 0,
                            plan: submission.homework?.plan,
                            deadline: submission.homework?.deadline ? 
                                (typeof submission.homework.deadline === 'string' ? submission.homework.deadline : submission.homework.deadline.toISOString()) 
                                : undefined,
                            createdAt: submission.homework?.createdAt ? 
                                (typeof submission.homework.createdAt === 'string' ? submission.homework.createdAt : submission.homework.createdAt.toISOString()) 
                                : undefined
                        });
                    }
                    
                    const homework = homeworkMap.get(homeworkId)!;
                    homework.submissionCount++;
                    if (submission.score !== null) {
                        homework.gradedCount++;
                    }
                });
                
                const homeworkArray = Array.from(homeworkMap.values());
                setData(homeworkArray);
                
                if (homeworkArray.length > 0) {
                    message.success(`成功加载 ${homeworkArray.length} 个作业`);
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
            const submissions = await getAllSubmissions();
            console.log('刷新获取到的数据:', submissions);
            
            // 重新处理数据
            const homeworkMap = new Map<string, HomeworkItem>();
            
            submissions.forEach(submission => {
                const homeworkId = submission.homework?.id;
                if (!homeworkId) return;
                
                if (!homeworkMap.has(homeworkId)) {
                    homeworkMap.set(homeworkId, {
                        id: homeworkId,
                        name: submission.homework?.name || '未命名作业',
                        courseName: submission.homework?.plan?.course?.name || '未知课程',
                        submissionCount: 0,
                        gradedCount: 0,
                        plan: submission.homework?.plan,
                        deadline: submission.homework?.deadline ? 
                            (typeof submission.homework.deadline === 'string' ? submission.homework.deadline : submission.homework.deadline.toISOString()) 
                            : undefined,
                        createdAt: submission.homework?.createdAt ? 
                            (typeof submission.homework.createdAt === 'string' ? submission.homework.createdAt : submission.homework.createdAt.toISOString()) 
                            : undefined
                    });
                }
                
                const homework = homeworkMap.get(homeworkId)!;
                homework.submissionCount++;
                if (submission.score !== null) {
                    homework.gradedCount++;
                }
            });
            
            const homeworkArray = Array.from(homeworkMap.values());
            setData(homeworkArray);
            message.success(`刷新成功，共 ${homeworkArray.length} 个作业`);
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

    // 获取当前显示的作业列表
    const getCurrentHomeworkList = () => {
        return isSearching ? filteredHomeworkList : data;
    };

    const columns = [
        {
            title: '序号',
            dataIndex: 'index',
            width: 60,
            render: (_: any, _record: any, idx: number) => idx + 1,
        },
        {
            title: '课程名称',
            dataIndex: 'courseName',
            width: 200,
            align: 'center' as const,
            render: (courseName: string) => (
                <div style={{
                    height: 48,
                    lineHeight: '48px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    color: '#1890ff',
                    fontWeight: 500
                }}>
                    {courseName}
                </div>
            )
        },
        {
            title: '作业名称',
            dataIndex: 'name',
            width: 300,
            ellipsis: true,
            render: (name: string) => (
                <div style={{
                    maxHeight: 48,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    fontWeight: 500
                }}>
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
            width: 120,
            align: 'center' as const,
            render: (_: any, record: HomeworkItem) => (
                <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        总计: {record.submissionCount}
                    </div>
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
            width: 150,
            align: 'center' as const,
            render: (_: any, record: HomeworkItem) => (
                <Space size="small">
                    <a onClick={() => {
                        setSelectedHomework(record);
                        setDetailModalVisible(true);
                    }}>查看详情</a>
                    <a onClick={() => handleGotoGrading(record)}>批改作业</a>
                </Space>
            ),
        },
    ];

    // 初始化过滤列表
    useEffect(() => {
        if (!isSearching) {
            setFilteredHomeworkList(data);
        }
    }, [data, isSearching]);

    // 处理搜索
    const handleSearch = () => {
        if (!searchText.trim()) {
            message.warning('请输入搜索关键词');
            return;
        }
        const filtered = data.filter(homework =>
            homework.name.toLowerCase().includes(searchText.toLowerCase().trim()) ||
            homework.courseName.toLowerCase().includes(searchText.toLowerCase().trim())
        );
        setFilteredHomeworkList(filtered);
        setIsSearching(true);
        if (filtered.length === 0) {
            message.info('未找到匹配的作业');
        } else {
            message.success(`找到 ${filtered.length} 个匹配的作业`);
        }
    };

    const handleClearSearch = () => {
        setSearchText('');
        setFilteredHomeworkList(data);
        setIsSearching(false);
        message.success('已清空搜索条件');
    };

    return (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 600 }}>作业批改</div>
                <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                    查看所有待批改的作业，点击"批改作业"进入具体批改页面
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
                            placeholder="请输入作业名称或课程名称进行搜索..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onPressEnter={handleSearch}
                            style={{ width: 500 }}
                            allowClear
                        />
                    </Col>
                    <Col span={8}>
                        <Space>
                            <Button type="primary" onClick={handleSearch} disabled={!searchText.trim()} style={{ left: '200px' }}>搜索</Button>
                            <Button 
                            onClick={handleClearSearch}
                            disabled={!isSearching}
                            style={{ left: '200px' }}
                            >
                                清空
                            </Button>
                        </Space>
                    </Col>
                    <Col span={8}>
                        {isSearching && (
                            <Tag color="blue" style={{ left: '90px' }}>
                                搜索中: "{searchText}" (找到 {filteredHomeworkList.length} 个结果)
                            </Tag>
                        )}
                    </Col>
                </Row>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <span style={{ color: '#666' }}>统计信息：</span>
                    <Tag color="blue">
                        总作业：{getCurrentHomeworkList().length} 个
                    </Tag>
                    {getCurrentHomeworkList().length > 0 && (
                        <>
                            <Tag color="green" style={{ marginLeft: 8 }}>
                                已完成批改：{getCurrentHomeworkList().reduce((sum, item) => sum + item.gradedCount, 0)} 份
                            </Tag>
                            <Tag color="orange" style={{ marginLeft: 8 }}>
                                待批改：{getCurrentHomeworkList().reduce((sum, item) => sum + (item.submissionCount - item.gradedCount), 0)} 份
                            </Tag>
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
                    showTotal: (total) => `共 ${total} 条`,
                }}
                loading={loading}
                rowClassName={() => 'fixed-row'}
                rowKey="id"
            />
            
            <Modal
                title="作业详情"
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
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
                            <Descriptions.Item label="提交人数">
                                {selectedHomework.submissionCount} 人
                            </Descriptions.Item>
                            <Descriptions.Item label="已批改">
                                {selectedHomework.gradedCount} 人
                            </Descriptions.Item>
                            <Descriptions.Item label="未批改">
                                {selectedHomework.submissionCount - selectedHomework.gradedCount} 人
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
                                            width: `${selectedHomework.submissionCount > 0 ? (selectedHomework.gradedCount / selectedHomework.submissionCount) * 100 : 0}%`,
                                            height: '100%',
                                            backgroundColor: '#52c41a',
                                            borderRadius: '5px',
                                            transition: 'width 0.3s ease'
                                        }}></div>
                                    </div>
                                    <span style={{ fontWeight: 600, color: '#52c41a' }}>
                                        {selectedHomework.submissionCount > 0 
                                            ? Math.round((selectedHomework.gradedCount / selectedHomework.submissionCount) * 100)
                                            : 0
                                        }%
                                    </span>
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