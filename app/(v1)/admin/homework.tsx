'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormRate,
  ProFormDigit,
  ProFormSlider,
} from '@ant-design/pro-components';
import markdownit from 'markdown-it';
import {
  Col,
  Row,
  message,
  Space,
  Rate,
  Table,
  Button,
  Card,
  Form,
  Input,
  Select,
  Statistic,
  Dropdown,
  Spin,
  Modal,
  Descriptions,
} from 'antd';
import type { MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import Link from 'next/link';

import {
  createCourse,
  getAllSubmissions,
  deleteCourse,
  updateCourseById,
  updateSubmissionById,
  getAllCourses,
  getHomeworkList,
  getCourseOptions,
  getClassOptions,
  getHomeworkOptions,
  getHomeworkStatistic,
} from '@/lib/course/actions';
import type {
  SubmissionsWithRelations,
  CoursesWithPlan,
} from '@/lib/course/actions';
import {
  parseAttachmentToUploadFile,
  parseUploadFileToUpsertUploadFile,
  renderCoverUrl,
  renderFileViewLink,
} from '@/utils/utils';
import { formConfig } from '@/utils/utils';

type RateForm = Pick<
  SubmissionsWithRelations,
  'id' | 'text' | 'score' | 'studentId' | 'homeworkId'
>;

type SelectOption = {
  value: string;
  label: string;
};

const md = markdownit({ html: true, breaks: true });

const Homework = () => {
  const formScoreRef = useRef<ProFormInstance>();
  const [formScoreData, setFormScoreData] = useState<RateForm>();
  const [list, setList] = useState<SubmissionsWithRelations[]>([]);
  const [modalScoreVisit, setModalScoreVisit] = useState(false);
  // 针对批量导出的loading
  const [exportLoading, setExportLoading] = useState(false);
  // 当前正在导出的单个项目列表
  const pendingExportRef = useRef<string[]>([]);
  const [pendingExport, setPendingExport] = useState<Array<string>>([]);
  const [form] = Form.useForm();
  const selectCourseId = Form.useWatch('course', form);
  const selectClassId = Form.useWatch('class', form);
  const [homeworkStatistic, setHomeworkStatistic] = useState<null | {
    submitted: MenuProps['items'];
    unSubmitted: MenuProps['items'];
  }>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [courseOptions, setCourseOptions] = useState<SelectOption[]>([]);
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [homeworkOptions, setHomeworkOptions] = useState<SelectOption[]>([]);

  const homeworkColumns: ColumnsType<SubmissionsWithRelations> = [
    {
      title: '信息',
      key: 'course-name',
      render: (_, record) => (
        <div>
          <p>课程：{record.homework.plan.course.name}</p>
          <p>班级：{record.homework.plan.class.name}</p>
          <p>作业：{record.homework.name}</p>
        </div>
      ),
    },
    {
      title: '学生',
      dataIndex: ['student', 'name'],
      key: 'student',
    },
    {
      title: '作业内容',
      width: 300,
      key: 'attachment',
      render: (_, record) => (
        <Space direction="vertical" size="middle">
          <div className="relative">
            <div
              className="mt-0 space-y-6 text-sm whitespace-pre-wrap text-gray-500 max-h-10 overflow-hidden max-w-80"
              dangerouslySetInnerHTML={{ __html: record.text || '' }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent"></div>
          </div>
          {record.attachments.map((item) => (
            <Link
              key={item.attachmentId}
              href={renderFileViewLink(item.attachment.fileKey)}
              target="_blank"
            >
              {item.attachment.name}
            </Link>
          ))}
        </Space>
      ),
    },
    {
      title: '提交时间',
      key: 'createdAt',
      render: (_, record) => (
        <span>{dayjs(record.createdAt).format('MM-DD HH:mm')}</span>
      ),
    },
    {
      title: '评分',
      key: 'score',
      width: 170,
      render: (_, record) => (
        <div>
          {record.comment ? <p>评语：{record.comment}</p> : null}
          <div>
            {record.score ? (
              <p>评分：{record.score}</p>
            ) : (
              <p className="text-xs text-gray-400">-</p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEditRate(record)}>
            评分
          </Button>
          {pendingExport.includes(record.id) ? (
            <Spin />
          ) : (
            <Button
              type="link"
              onClick={() => {
                handleExport([record]);
              }}
            >
              导出
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const getData = async () => {
    const data = await getHomeworkList({});
    setList(data);
  };
  const handleEditRate = (item: SubmissionsWithRelations) => {
    setFormScoreData({
      ...item,
      studentId: item.student.id,
      homeworkId: item.homework.id,
      id: item.id,
    });
    setModalScoreVisit(true);
  };

  const handleExport = async (records: SubmissionsWithRelations[]) => {
    const submissionIds = records.map((item) => item.id);
    const set: string[] = pendingExportRef.current;
    submissionIds.forEach((item) => {
      if (!set.includes(item)) {
        set.push(item);
      }
    });
    pendingExportRef.current = [...set];
    setPendingExport(pendingExportRef.current);
    setExportLoading(true);
    try {
      const response = await fetch('/api/homework/export', {
        method: 'POST',
        body: JSON.stringify({
          id: submissionIds,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 先看响应头是否导出成功
      const isSuccess = response.headers.get('X-Export-Status') === '0';

      if (!isSuccess) {
        alert('导出失败，错误码：' + response.headers.get('X-Export-Status'));
        return;
      }

      const data = await response.blob();

      const blobUrl = window.URL.createObjectURL(data);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      // tempLink.setAttribute('download', `${submissionIds.join('-')}.pdf`);
      const names = records.map(
        (item: SubmissionsWithRelations) => item.homework.name,
      );
      tempLink.setAttribute('download', `${names[0]}.pdf`);
      tempLink.click();

      window.URL.revokeObjectURL(blobUrl);
    } finally {
      setExportLoading(false);
      pendingExportRef.current = pendingExportRef.current.filter(
        (item) => !submissionIds.includes(item),
      );
      setPendingExport(pendingExportRef.current);
    }
  };

  const handleSearch = async (searchData: {
    course?: string;
    class?: string;
    homework?: string;
  }) => {
    const resp = await getHomeworkList({
      courseId: searchData.course,
      classId: searchData.class,
      homeworkId: searchData.homework,
    });

    const statistic = await getHomeworkStatistic(
      searchData.class!,
      searchData.homework!,
    );

    if (!statistic) {
      setHomeworkStatistic(null);
    } else {
      setHomeworkStatistic({
        submitted: statistic.submittedStudentes.map((item) => ({
          key: item.id,
          label: item.name,
        })),
        unSubmitted: statistic.unSubmittedStudentes.map((item) => ({
          key: item.id,
          label: item.name,
        })),
      });
    }

    if (Array.isArray(resp)) {
      setList(resp);
    }
  };

  const handleCheckAI = async (text: string) => {
    setAiLoading(true);
    try {
    const response = await fetch('/api/ai/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: text,
          },
        ],
      }),
    });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
    const data = await response.json();
    if (data.code === 0) {
      Modal.info({
        title: 'AI 评分结果',
        okText: '填充评分',
        footer: null,
        closable: true,
        content: (
          <Descriptions column={1}>
            <Descriptions.Item label="评分">
              {data.data.score}
            </Descriptions.Item>
            <Descriptions.Item label="评语">
              <div
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: md.render(data.data.comment),
                }}
              />
            </Descriptions.Item>
          </Descriptions>
        ),
      });
      } else {
        throw new Error(data.msg || 'AI评分失败');
      }
    } catch (error) {
      console.error('AI评分错误:', error);
      Modal.error({
        title: 'AI评分失败',
        content: (
          <div>
            <p>AI评分功能暂时不可用，可能的原因：</p>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>API密钥未配置或配置错误</li>
              <li>网络连接问题</li>
              <li>服务暂时不可用</li>
            </ul>
            <p style={{ marginTop: '8px', color: '#666' }}>
              请手动进行评分，或联系管理员配置AI评分功能。
            </p>
          </div>
        ),
        okText: '我知道了'
      });
    } finally {
    setAiLoading(false);
    }
  };

  useEffect(() => {
    getData();
    // 查询课程列表
    getCourseOptions().then((courseOptions) => {
      if (Array.isArray(courseOptions)) {
        setCourseOptions(courseOptions);
      }
    });
  }, []);

  useEffect(() => {
    if (selectCourseId === undefined) {
      form.resetFields(['class', 'homework']);
      setClassOptions([]);
      setHomeworkOptions([]);
    }

    if (selectClassId === undefined && selectCourseId) {
      form.resetFields(['homework']);
      setHomeworkOptions([]);
    }

    if (selectCourseId) {
      getClassOptions(selectCourseId).then((classOptions) => {
        if (Array.isArray(classOptions)) {
          setClassOptions(classOptions);
        }
      });
    }

    if (selectCourseId && selectClassId) {
      getHomeworkOptions(selectCourseId, selectClassId).then(
        (homeworkOptions) => {
          if (Array.isArray(homeworkOptions)) {
            setHomeworkOptions(homeworkOptions);
          }
        },
      );
    }
  }, [selectCourseId, selectClassId, form]);

  return (
    <div>
      <div className="w-full mb-4">
        <Form
          form={form}
          layout="inline"
          className="gap-2"
          // initialValues={search}
          onFinish={handleSearch}
        >
          <Form.Item label="课程名称" name="course">
            <Select
              allowClear
              showSearch
              style={{ minWidth: 200 }}
              optionFilterProp="label"
              placeholder="请选择课程"
              className="fix-select-input-border"
              options={courseOptions}
            />
          </Form.Item>
          <Form.Item label="班级名称" name="class">
            <Select
              allowClear
              showSearch
              style={{ minWidth: 200 }}
              optionFilterProp="label"
              placeholder="请选择班级"
              className="fix-select-input-border"
              options={classOptions}
            />
          </Form.Item>
          <Form.Item label="作业名称" name="homework">
            <Select
              allowClear
              showSearch
              style={{ minWidth: 200 }}
              optionFilterProp="label"
              placeholder="请选择作业"
              className="fix-select-input-border"
              options={homeworkOptions}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              搜索
            </Button>
            {homeworkStatistic !== null && (
              <Button
                className="ml-2"
                loading={exportLoading}
                onClick={() => {
                  handleExport(list);
                }}
              >
                批量导出
              </Button>
            )}
          </Form.Item>
        </Form>
      </div>
      {homeworkStatistic !== null && (
        <Row className="mb-4" gutter={24}>
          <Col>
            <Dropdown menu={{ items: homeworkStatistic.submitted }}>
              <Card bordered={false}>
                <Statistic
                  title="提交作业"
                  value={homeworkStatistic.submitted!.length}
                />
              </Card>
            </Dropdown>
          </Col>
          <Col>
            <Dropdown menu={{ items: homeworkStatistic.unSubmitted }}>
              <Card bordered={false}>
                <Statistic
                  title="未提交作业"
                  value={homeworkStatistic.unSubmitted!.length}
                />
              </Card>
            </Dropdown>
          </Col>
        </Row>
      )}
      <Table
        className="mb-4"
        title={() => (
          <div className="flex justify-between">
            <p>作业列表</p>
          </div>
        )}
        bordered
        size="small"
        rowKey="id"
        columns={homeworkColumns}
        dataSource={list}
      />

      <ModalForm<RateForm>
        {...formConfig}
        formRef={formScoreRef}
        title="评分"
        modalProps={{
          destroyOnClose: true,
          width: '90%',
        }}
        open={modalScoreVisit}
        onOpenChange={setModalScoreVisit}
        onInit={() => {
          if (formScoreRef.current) {
            if (formScoreData) {
              formScoreRef.current.setFieldsValue(formScoreData);
            } else {
              formScoreRef.current.resetFields();
            }
          }
        }}
        onFinish={async (values) => {
          console.log(values);
          if (values.id) {
            updateSubmissionById(values);
          }

          await getData();
          message.success('提交成功');
          setModalScoreVisit(false);
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText name="studentId" hidden />
        <ProFormText name="homeworkId" hidden />
        <div className="flex gap-2">
          <div className="flex-1 border rounded-2xl p-2 overflow-y-auto">
            <div
              className="mt-0 space-y-6 text-sm whitespace-pre-wrap rtf_note preview text-gray-500"
              dangerouslySetInnerHTML={{ __html: formScoreData?.text || '' }}
            />
          </div>
          <div className="w-72">
            <div className="mb-4 border-b pb-4">
              <Button
                className=""
                type="default"
                block
                disabled={aiLoading}
                loading={aiLoading}
                onClick={() => handleCheckAI(formScoreData?.text || '')}
              >
                AI 评分
              </Button>
            </div>
            <ProFormSlider
              name="score"
              label="评分"
              fieldProps={{
                tooltip: {},
              }}
              min={0}
              max={100}
            />

            <ProFormTextArea
              width="md"
              name="comment"
              label="评语"
              tooltip=""
              placeholder="请输入评语"
            />
          </div>
        </div>
      </ModalForm>
    </div>
  );
};

export default Homework;
