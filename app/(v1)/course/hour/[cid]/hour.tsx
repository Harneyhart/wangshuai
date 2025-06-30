'use client';

import { useEffect, useState, useRef } from 'react';
import dayjs from 'dayjs';
import Link from 'next/link';
import { Bubble, Sender, useXAgent, useXChat, Suggestion } from '@ant-design/x';

import {
  Space,
  Table,
  Tabs,
  Button,
  Form,
  Input,
  Descriptions,
  Spin,
  Modal,
  message,
} from 'antd';
import {
  FormControlRender,
  ModalForm,
  pickControlPropsWithId,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormUploadButton,
  ProFormUploadDragger,
} from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-components';
import type {
  TableProps,
  TabsProps,
  DescriptionsProps,
  UploadFile,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus } from '@phosphor-icons/react';
import { useParams, usePathname, useRouter } from 'next/navigation';

import {
  getCourseHourById,
  createSubmission,
  getSubmissionsByUserIdAndHomeworkId,
  checkIsStudent,
  upsertSubmission,
} from '@/lib/course/actions';
import type {
  CourseHoursWithRelations,
  CreateSubmissionItem,
  SubmissionsWithRelations,
} from '@/lib/course/actions';
import { validateRequest } from '@/lib/auth/validate-request';
import {
  parseUploadFileToUpsertUploadFile,
  renderFileViewLink,
} from '@/utils/utils';
import TinyMceEditor from '@/components/Editor';
import { analyzePdfContent } from '@/lib/ai/actions';
import Chat from '@/components/modal/Chat';

type DescProps = CourseHoursWithRelations & {
  // name: string;
  // items: DescriptionsProps['items'];
};
type SubmissionFormProps = {
  id?: string;
  homeworkId: string;
  // studentId: string;
  text: string;
  attachments?: UploadFile[];
};
const Desc: React.FC<DescProps> = ({
  id,
  plan,
  teachers,
  assistants,
  operators,
  classRoom,
  startTime,
  endTime,
}) => {
  const items: DescriptionsProps['items'] = [
    {
      key: '1',
      label: '编号',
      children: id,
    },
    {
      key: '2',
      label: '教师',
      children: teachers.map((item) => item.teacher.name).join('、'),
    },
    {
      key: '7',
      label: '班级',
      children: plan.class.name,
    },
    {
      key: '3',
      label: '助教',
      children: assistants.map((item) => item.teacher.name).join('、'),
    },
    {
      key: '4',
      label: '实验老师',
      children: operators.map((item) => item.teacher.name).join('、'),
    },
    {
      key: '5',
      label: '教室',
      children: classRoom,
    },
    {
      key: '6',
      label: '时间',
      children: `${dayjs(startTime).format('MM-DD HH:mm')} - ${dayjs(
        endTime,
      ).format('MM-DD HH:mm')}`,
    },
  ];
  return (
    <div className="mb-4 bg-slate-50 p-4 rounded-md">
      <Descriptions
        column={{ xs: 2, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
        title={plan.course.name}
        bordered={false}
        layout="vertical"
        items={items}
      />
    </div>
  );
};

type SubmissionListModalProps = {
  open: boolean;
  data?: SubmissionsWithRelations[];
  onCancel?: () => void;
  onEditSubmission: () => void;
};
const SubmissionListModal: React.FC<SubmissionListModalProps> = ({
  open,
  data = [],
  onCancel,
  onEditSubmission,
}) => {
  const columns: ColumnsType<SubmissionsWithRelations> = [
    {
      title: '学生',
      dataIndex: ['student', 'name'],
      key: 'student.name',
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: (text: string, record: SubmissionsWithRelations) => (
        <span>{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</span>
      ),
    },
    {
      title: '内容',
      dataIndex: 'text',
      key: 'text',
      render: (text: string, record: SubmissionsWithRelations) => (
        <div
          className="rtf_note max-h-80 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      ),
    },
    {
      title: '老师评分',
      key: 'comment',
      render: (text: string, record: SubmissionsWithRelations) => (
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
      title: '查看',
      key: 'action',
      render: (text: string, record: SubmissionsWithRelations) => (
        <div className="flex gap-x-2">
          {record.attachments.map((item, index) => (
            <Link
              key={item.attachment.id}
              target="_blank"
              href={renderFileViewLink(item.attachment.fileKey)}
              type="link"
            >
              附件{index + 1}
            </Link>
          ))}
        </div>
      ),
    },
  ];
  if (!data) {
    return null;
  }
  return (
    <Modal
      title="学生提交的作业"
      open={open}
      footer={null}
      onCancel={onCancel}
      width="90%"
    >
      <Button className="mb-2" onClick={onEditSubmission}>
        修改作业
      </Button>
      <Table dataSource={data} rowKey="id" columns={columns} />
    </Modal>
  );
};

type TaskListProps = {
  data: CourseHoursWithRelations['plan']['homeworks'];
};
const TaskList: React.FC<TaskListProps> = ({ data }) => {
  const router = useRouter();
  const formSubmissionRef = useRef<ProFormInstance>();
  const [modalSubmissionVisit, setModalSubmissionVisit] = useState(false);
  const [formSubmissionData, setFormSubmissionData] =
    useState<CreateSubmissionItem>();
  const [submissionList, setSubmissionList] = useState<
    SubmissionsWithRelations[]
  >([]);
  const [modalSubmissionList, setModalSubmissionList] = useState({
    open: false,
  });

  const handleSubmit = async (homeworkId: string) => {
    const { user } = await validateRequest();
    if (!user) {
      alert('请先登录');
      router.push('/login');
      return;
    }
    // 判断是否是学生
    const isStudent = await checkIsStudent(user.id);
    if (!isStudent) {
      alert('您不是学生，无法提交作业');
      return;
    }
    // 判断是否提交过作业
    const data = await getSubmissionsByUserIdAndHomeworkId(homeworkId);
    if (data.length > 0) {
      alert('您已经提交过作业了');
      return;
    }
    setFormSubmissionData({
      homeworkId,
      text: '',
    });
    setModalSubmissionVisit(true);
  };

  const columns: TableProps<
    CourseHoursWithRelations['plan']['homeworks'][0]
  >['columns'] = [
    {
      title: '',
      dataIndex: 'key',
      render: (text, record, index) => <p>{index + 1}</p>,
    },
    {
      title: '作业',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '截止日期',
      key: 'deadline',
      render: (_: any, record: any) => (
        <p>{dayjs(record.deadline).format('YYYY-MM-DD')}</p>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" onClick={() => getSubmissionList(record.id)}>
            查看我的提交
          </Button>
          <Button type="link" onClick={() => handleSubmit(record.id)}>
            提交作业
          </Button>
        </Space>
      ),
    },
  ];
  const getSubmissionList = async (homeworkId: string) => {
    const data = await getSubmissionsByUserIdAndHomeworkId(homeworkId);
    console.log('data', data);
    setSubmissionList(data);
    setModalSubmissionList({ open: true });
  };

  const handleEditSubmission = () => {
    const submission = submissionList[0];

    if (!submission) return;

    const { homeworkId, score, text = '', attachments } = submission;

    if (score !== null) {
      alert('评分之后作业不能修改');
      return;
    }

    setFormSubmissionData({
      homeworkId,
      text: text ?? '',
      attachments: (attachments ?? []).map((item) => ({
        fileName: item.attachment.fileName,
        fileKey: item.attachment.fileKey,
        name: item.attachment.name,
      })),
      submissionId: submissionList[0].id,
    });
    setModalSubmissionVisit(true);
  };

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="flex gap-x-2">
          {/*
          <Button type="primary" icon={<Plus size={14} weight="bold" />}>
            添加
          </Button>
          <Button className="">批量导入学生</Button>
          */}
        </div>
        {/*
        <Form
          layout="inline"

          // initialValues={{ layout: formLayout }}
          // onValuesChange={onFormLayoutChange}
          // style={{ maxWidth: formLayout === 'inline' ? 'none' : 600 }}
        >
          <Form.Item label="作业">
            <Input placeholder="作业" />
          </Form.Item>
          <Form.Item>
            <Button type="primary">搜索</Button>
          </Form.Item>
        </Form>
        */}
      </div>
      <Table dataSource={data} rowKey="id" columns={columns} />
      <ModalForm<SubmissionFormProps>
        formRef={formSubmissionRef}
        labelCol={{ span: 6 }}
        // wrapperCol={{ span: 18 }}
        layout="vertical"
        title="提交作业"
        modalProps={{
          destroyOnClose: true,
          width: '90%',
          onCancel: () => console.log('run'),
        }}
        open={modalSubmissionVisit}
        onInit={() => {
          if (formSubmissionRef.current) {
            if (formSubmissionData) {
              formSubmissionRef.current.setFieldsValue(formSubmissionData);
            } else {
              formSubmissionRef.current.resetFields();
            }
          }
        }}
        initialValues={{
          order: 1,
        }}
        onOpenChange={setModalSubmissionVisit}
        onFinish={async (values) => {
          // 校验表单的 values
          console.log(values);
          const attachments = parseUploadFileToUpsertUploadFile(
            values.attachments,
          ).map((item) => ({
            ...item,
            name: item.fileName,
          }));
          /*
          if (attachments.length === 0) {
            alert('请上传附件');
            return;
          }
          */

          // 通过 isUpdate 标记区分本次是修改作业还是创建作业
          if (formSubmissionData?.submissionId) {
            const result = await upsertSubmission({
              ...values,
              attachments,
              submissionId: formSubmissionData.submissionId,
            });

            if (result === true) {
              message.success('修改成功');
              setModalSubmissionList({ open: false });
            } else {
              message.error('修改失败');
            }
          } else {
            await createSubmission({
              ...values,
              attachments,
            });
          }

          setModalSubmissionVisit(false);
          // getData();
          // message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText name="homeworkId" hidden />
        <ProFormText name="studentId" hidden />
        <ProFormText name="order" hidden />
        <ProFormTextArea
          width="md"
          name="text"
          required
          label="作业内容"
          placeholder="请输入作业内容"
          rules={[
            {
              required: true,
              message: '请输入作业内容',
            },
          ]}
        >
          <FormControlRender>
            {(itemProps) => {
              return (
                <TinyMceEditor
                  height="500px"
                  inline={false}
                  contentStyle="padding: 10px"
                  {...pickControlPropsWithId(itemProps)}
                />
              );
            }}
          </FormControlRender>
        </ProFormTextArea>
        {/*
        <input name="text" />
        */}
        <ProFormUploadDragger
          hidden
          width="md"
          label="附件"
          name="attachments"
          fieldProps={{
            name: 'file',
          }}
          action="/api/upload"
        />
      </ModalForm>
      <SubmissionListModal
        open={modalSubmissionList.open}
        data={submissionList}
        onCancel={() => setModalSubmissionList({ open: false })}
        onEditSubmission={handleEditSubmission}
      />
    </div>
  );
};
type AttachmentListProps = {
  data: CourseHoursWithRelations['plan']['attachments'];
  onChatOpen: (fileKey: string) => void;
};
const AttachmentList: React.FC<AttachmentListProps> = ({
  data,
  onChatOpen,
}) => {
  const formSubmissionRef = useRef<ProFormInstance>();
  const [modalSubmissionVisit, setModalSubmissionVisit] = useState(false);
  const [formSubmissionData, setFormSubmissionData] =
    useState<CreateSubmissionItem>();

  const handleAiQuestion = async (fileKey: string) => {
    console.log('handleAiQuestion', fileKey);
    onChatOpen(fileKey);
  };

  const columns: TableProps<
    CourseHoursWithRelations['plan']['attachments'][0]
  >['columns'] = [
    /*
      {
        title: '编号',
        dataIndex: 'key',
        render: (text, record, index) => <p>{index + 1}</p>,
      },
      */
    {
      title: '名称',
      dataIndex: ['attachment', 'name'],
      key: 'name',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Link
            href={renderFileViewLink(record.attachment.fileKey)}
            target="_blank"
            type="link"
          >
            查看
          </Link>
          {/* AI 提问 */}
          <Button
            type="link"
            onClick={() => handleAiQuestion(record.attachment.fileKey)}
          >
            AI 提问
          </Button>
        </Space>
      ),
    },
  ];
  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="flex gap-x-2">
          {/*
          <Button type="primary" icon={<Plus size={14} weight="bold" />}>
            添加
          </Button>
          <Button className="">批量导入学生</Button>
          */}
        </div>
        {/*
        <Form
          layout="inline"

          // initialValues={{ layout: formLayout }}
          // onValuesChange={onFormLayoutChange}
          // style={{ maxWidth: formLayout === 'inline' ? 'none' : 600 }}
        >
          <Form.Item label="课件">
            <Input placeholder="课件" />
          </Form.Item>
          <Form.Item>
            <Button type="primary">搜索</Button>
          </Form.Item>
        </Form>
        */}
      </div>
      <Table dataSource={data} rowKey="attachmentId" columns={columns} />
      <ModalForm<CreateSubmissionItem>
        formRef={formSubmissionRef}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        layout="horizontal"
        modalProps={{
          destroyOnClose: true,
          width: 600,
          onCancel: () => console.log('run'),
        }}
        open={modalSubmissionVisit}
        onInit={() => {
          if (formSubmissionRef.current) {
            if (formSubmissionData) {
              formSubmissionRef.current.setFieldsValue(formSubmissionData);
            } else {
              formSubmissionRef.current.resetFields();
            }
          }
        }}
        initialValues={{
          order: 1,
        }}
        onOpenChange={setModalSubmissionVisit}
        onFinish={async (values) => {
          // 校验表单的 values
          console.log(values);
          await createSubmission(values);
          setModalSubmissionVisit(false);
          // getData();
          // message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText name="homeworkId" hidden />
        <ProFormText name="studentId" hidden />
        <ProFormText name="order" hidden />
        <ProFormTextArea
          width="md"
          name="text"
          required
          label="作业内容"
          placeholder="请输入作业内容"
          rules={[
            {
              required: true,
              message: '请输入作业内容',
            },
          ]}
        />
      </ModalForm>
    </div>
  );
};
const Course = () => {
  const [detail, setDetail] = useState<CourseHoursWithRelations>();
  const { cid } = useParams();
  const [chatModal, setChatModal] = useState<{
    visible: boolean;
    fileKey: string;
  }>({
    visible: false,
    fileKey: '',
  });
  const getData = async () => {
    if (cid) {
      const data = await getCourseHourById(cid as string);
      if (data) {
        setDetail(data);
        document.title = `${data.plan.course.name} - BioAZ`;
      }
    }
  };
  const handleChatOpen = (fileKey: string) => {
    console.log('handleChatOpen', fileKey);
    setChatModal({
      visible: true,
      fileKey,
    });
  };
  const handleChatModalClose = () => {
    setChatModal({
      visible: false,
      fileKey: '',
    });
  };
  const handleTabChange = (key: string) => {
    console.log(key);
  };
  const items: TabsProps['items'] = [
    {
      key: '1',
      label: '课件',
      children: (
        <AttachmentList
          data={detail?.plan.attachments ?? []}
          onChatOpen={handleChatOpen}
        />
      ),
    },
    {
      key: '2',
      label: '作业',
      children: <TaskList data={detail?.plan.homeworks ?? []} />,
    },
    {
      key: '3',
      label: '课程安排',
      children: <p className=" m-10 text-center">暂无</p>,
    },
    {
      key: '4',
      label: '通知',
      children: <p className=" m-10 text-center">暂无</p>,
    },
  ];
  useEffect(() => {
    getData();
  }, [cid]);
  if (!detail) {
    return (
      <Spin spinning={!detail}>
        <div className="h-20"></div>
      </Spin>
    );
  }
  return (
    <div>
      <Desc {...detail} />
      <p className=" text-sm text-gray-600 mb-4">
        {detail.plan.course.description}
      </p>
      <Tabs defaultActiveKey="2" items={items} onChange={handleTabChange} />
      {chatModal.fileKey && (
        <Chat
          visible={chatModal.visible}
          // fileKey="1730087935982-5usbm.pdf"
          fileKey={chatModal.fileKey}
          onClose={handleChatModalClose}
        />
      )}
    </div>
  );
};

export default Course;
