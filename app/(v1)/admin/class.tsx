'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormDatePicker,
  ProFormSelect,
  ProFormText,
  ProFormRadio,
  ProFormTextArea,
  ProFormUploadDragger,
} from '@ant-design/pro-components';
import {
  App,
  Col,
  Row,
  Space,
  Popconfirm,
  Button,
  List,
  Tabs,
  Card,
  Tag,
  Table,
  Dropdown,
  Modal,
} from 'antd';
import type { TableProps, MenuProps, UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import {
  getAllStudents,
  getAllCourses,
  getAllClasses,
  createClass,
  deleteClass,
  createCoursePlan,
  createHomework,
  deleteCoursePlan,
  createAttachment,
  getSubmissionsByHomeworkId,
  updateClassById,
} from '@/lib/course/actions';
import type {
  UserItem,
  StudentsWithUser,
  CoursesWithPlan,
  CreateClassItem,
  UpdateClassItem,
  ClassesWithStudents,
  CreateCoursePlanItem,
  CreateHomeworkItem,
  UpdateHomeworkItem,
  CreateAttachmentItem,
  SubmissionsWithRelations,
} from '@/lib/course/actions';
import { formConfig, renderFileViewLink } from '@/utils/utils';
import { parseUploadFileToUpsertUploadFile } from '@/utils/utils';
import Link from 'next/link';

type AttachmentFormProps = {
  name: string;
  attachments: UploadFile[];
};

type SubmissionListModalProps = {
  open: boolean;
  homeworkId?: string;
  onOk?: () => void;
  onCancel?: () => void;
};
const SubmissionListModal: React.FC<SubmissionListModalProps> = ({
  open,
  homeworkId,
  onCancel,
  onOk,
}) => {
  const [list, setList] = useState<SubmissionsWithRelations[]>([]);

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
          className="mt-3 space-y-6 text-sm whitespace-pre-wrap text-gray-500"
          dangerouslySetInnerHTML={{ __html: text }}
        />
      ),
    },
    {
      title: '附件',
      key: 'action',
      width: 100,
      render: (text: string, record: SubmissionsWithRelations) => (
        <div className="flex flex-col">
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
  const getData = async () => {
    if (!homeworkId) {
      return;
    }
    const data = await getSubmissionsByHomeworkId(homeworkId);
    setList(data);
  };
  useEffect(() => {
    getData();
  }, [homeworkId]);
  if (!homeworkId) {
    return null;
  }
  return (
    <Modal
      title="学生提交的作业"
      width="90%"
      open={open}
      footer={null}
      onCancel={onCancel}
    >
      <Table dataSource={list} rowKey="id" columns={columns} />
    </Modal>
  );
};

const ClassList = () => {
  const { modal, message } = App.useApp();

  const formClassRef = useRef<ProFormInstance>();
  const formClassPlanRef = useRef<ProFormInstance>();
  const formHomeworkRef = useRef<ProFormInstance>();
  const formAttachmentRef = useRef<ProFormInstance>();

  const [formCoursePlanData, setFormCoursePlanData] =
    useState<CreateCoursePlanItem>();
  const [formHomeworkData, setFormHomeworkData] =
    useState<CreateHomeworkItem>();
  const [formAttachmentData, setFormAttachmentData] =
    useState<CreateAttachmentItem>();
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

  const handleAddHomework = (coursePlanId: string) => {
    console.log('handleAddHomework', coursePlanId);
    setFormHomeworkData({
      coursePlanId,
      name: '',
      description: '',
      order: 1,
      deadline: new Date(),
    });
    setModalHomeworkVisit(true);
  };
  const handleAddAttachment = (coursePlanId: string) => {
    console.log('handleAddAttachment', coursePlanId);
    setModalAttachmentVisit(true);
    setFormAttachmentData({
      coursePlanId,
      name: '',
    });
  };

  const actionMenuItems: MenuProps['items'] = [
    {
      label: '添加课件',
      key: 'attachment',
    },
    {
      label: '添加作业',
      key: 'homework',
    },
    {
      label: '全部作业',
      key: 'all-homework',
    },
    {
      label: '删除课程',
      key: 'delete',
      danger: true,
    },
  ];

  const courseColumns: ColumnsType<ClassesWithStudents['plans'][0]> = [
    {
      title: '课程介绍',
      key: 'name',
      render: (text: string, record: ClassesWithStudents['plans'][0]) => (
        <Space direction="vertical">
          <p>{record.course.name}</p>
          <p className="text-gray-600">{record.course.description}</p>
        </Space>
      ),
    },
    {
      title: '课件',
      key: 'attachment',
      width: 300,
      render: (text: string, record: ClassesWithStudents['plans'][0]) => (
        <List
          bordered
          size="small"
          itemLayout="horizontal"
          dataSource={record.attachments}
          renderItem={(attachment, index) => (
            <List.Item>
              <List.Item.Meta
                title={attachment.attachment.name}
                description={
                  <Link
                    target="_blank"
                    href={renderFileViewLink(attachment.attachment.fileKey)}
                  >
                    查看
                  </Link>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      title: '作业',
      key: 'homework',
      width: 300,
      render: (text: string, record: ClassesWithStudents['plans'][0]) => (
        <List
          bordered
          size="small"
          itemLayout="horizontal"
          dataSource={record.homeworks}
          renderItem={(homework, index) => (
            <List.Item>
              <List.Item.Meta
                title={homework.name}
                description={homework.description}
              />
              <Button
                type="link"
                onClick={() =>
                  setModalSubmissionList({
                    open: true,
                    homeworkId: homework.id,
                  })
                }
              >
                查看提交
              </Button>
            </List.Item>
          )}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (text: string, record: ClassesWithStudents['plans'][0]) => (
        <Dropdown.Button
          menu={{
            items: actionMenuItems,
            onClick: ({ key }) => {
              if (key === 'homework') {
                handleAddHomework(record.id);
              } else if (key === 'attachment') {
                handleAddAttachment(record.id);
              } else if (key === 'delete') {
                modal.confirm({
                  title: '确定要删除？',
                  content: '删除后不可恢复',
                  onOk: async () => {
                    await deleteCoursePlan(record.id);
                    getData();
                  },
                  onCancel() {
                    console.log('Cancel');
                  },
                });
              }
            },
          }}
          onClick={() => null}
        >
          排课
        </Dropdown.Button>
      ),
    },
  ];
  const getData = async () => {
    const data = await getAllClasses();
    setList(data);
  };
  const handleDelete = async (id: string) => {
    try {
      // 找到要删除的班级信息
      const classToDelete = list.find(item => item.id === id);
      const className = classToDelete?.name || '未知班级';
      
      const result = await deleteClass(id);
      
      if (result && result.success) {
        message.success(`班级"${className}"已成功删除，所有相关数据已清理`);
        await getData(); // 刷新列表
      } else {
        message.error(result?.error || '删除失败，请重试');
      }
    } catch (error) {
      console.error('删除班级失败:', error);
      message.error(error instanceof Error ? error.message : '删除失败，请检查网络连接');
    }
  };
  const handleAddClass = () => {
    setFormClassData(undefined);
    setModalClassVisit(true);
  };
  const handleEditClass = (item: ClassesWithStudents) => {
    console.log('handleEditClass', item);
    setFormClassData({
      ...item,
      students: item.students.map((student) => student.student.id),
    });
    setModalClassVisit(true);
  };
  const handleAddCoursePlan = (info: ClassesWithStudents) => {
    setFormCoursePlanData({
      // year: dayjs().unix() * 1000,
      // year: dayjs(),
      year: dayjs().year().toString(),
      classId: info.id,
      courseId: '',
    });
    setModalClassPlanVisit(true);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <div className="mb-4">
        <Button type="primary" onClick={handleAddClass}>
          新建班级
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {list.map((item, index) => (
          <Col span={24} key={item.id}>
            <Card
              bordered
              size="small"
              title={item.name}
              extra={
                <div className="flex gap-x-2">
                  <Button
                    key="edit"
                    type="link"
                    onClick={() => handleEditClass(item)}
                  >
                    编辑班级
                  </Button>
                  <Popconfirm
                    key="delete"
                    title="确定要删除此班级吗？"
                    description={
                      <div>
                        <p>此操作将删除：</p>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: '12px' }}>
                          <li>班级基本信息</li>
                          <li>学生-班级关系</li>
                          <li>所有课程计划</li>
                          <li>所有课时安排</li>
                          <li>所有作业及提交</li>
                          <li>相关附件关系</li>
                        </ul>
                        <p style={{ color: 'red', margin: '8px 0 0 0', fontSize: '12px' }}>
                          此操作不可恢复，请谨慎操作！
                        </p>
                      </div>
                    }
                    onConfirm={() => handleDelete(item.id)}
                    okText="确定删除"
                    cancelText="取消"
                    okType="danger"
                    placement="topLeft"
                  >
                    <Button type="link" danger>
                      删除班级
                    </Button>
                  </Popconfirm>
                </div>
              }
              actions={[]}
            >
              <div className="mb-4">
                学生列表：
                {item.students.map((item) => (
                  <Tag key={item.studentId}>{item.student.name}</Tag>
                ))}
              </div>

              <Table<ClassesWithStudents['plans'][0]>
                className="mb-4"
                title={() => (
                  <div className="flex justify-between">
                    <p>课程列表</p>
                    <Button
                      type="primary"
                      onClick={() => handleAddCoursePlan(item)}
                    >
                      添加课程
                    </Button>
                  </div>
                )}
                bordered
                size="small"
                columns={courseColumns}
                rowKey="id"
                dataSource={item.plans}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <ModalForm<CreateCoursePlanItem>
        {...formConfig}
        title="课程"
        formRef={formClassPlanRef}
        open={modalClassPlanVisit}
        onOpenChange={setModalClassPlanVisit}
        onFinish={async (values) => {
          console.log(values);
          createCoursePlan(values);
          getData();
          setModalClassPlanVisit(false);
          message.success('提交成功');
        }}
        onInit={() => {
          if (formClassPlanRef.current) {
            if (formCoursePlanData) {
              console.log('formCoursePlanData', formCoursePlanData);
              formClassPlanRef.current.setFieldsValue(formCoursePlanData);
            } else {
              formClassPlanRef.current.resetFields();
            }
          }
        }}
        params={{}}
      >
        <ProFormText name="classId" hidden />
        <ProFormDatePicker
          width="md"
          name="year"
          required
          fieldProps={{
            picker: 'year',
            format: 'YYYY',
          }}
          dataFormat="YYYY"
          label="学年"
          tooltip=""
          placeholder="请选择学年"
        />
        <ProFormRadio.Group
          name="semester"
          label="学期"
          options={[
            {
              label: '上学期',
              value: 0,
            },
            {
              label: '下学期',
              value: 1,
            },
          ]}
        />
        <ProFormSelect
          label="选择课程"
          width="md"
          required
          showSearch={false}
          request={async () => {
            const data = await getAllCourses();
            return data.map((course: CoursesWithPlan) => {
              return {
                value: course.id,
                label: course.name,
              };
            });
          }}
          name="courseId"
        />
      </ModalForm>

      <ModalForm<UpdateClassItem>
        {...formConfig}
        title="班级"
        formRef={formClassRef}
        open={modalClassVisit}
        onOpenChange={setModalClassVisit}
        onInit={() => {
          if (formClassRef.current) {
            if (formClassData) {
              formClassRef.current.setFieldsValue(formClassData);
            } else {
              formClassRef.current.resetFields();
            }
          }
        }}
        onFinish={async (values) => {
          console.log(values);
          if (values.id) {
            updateClassById(values);
          } else {
            createClass(values);
          }
          getData();
          setModalClassVisit(false);
          message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText
          width="md"
          name="name"
          required
          label="班级名称"
          tooltip=""
          placeholder="请输入班级名称"
        />
        <ProFormSelect
          label="选择学生"
          width="md"
          mode="multiple"
          showSearch={false}
          request={async () => {
            const data = await getAllStudents();
            return data.map((student: StudentsWithUser) => {
              return {
                value: student.id,
                label: student.name,
              };
            });
          }}
          name="students"
        />
      </ModalForm>

      <ModalForm<CreateHomeworkItem | UpdateHomeworkItem>
        {...formConfig}
        title="作业"
        formRef={formHomeworkRef}
        open={modalHomeworkVisit}
        onInit={() => {
          if (formHomeworkRef.current) {
            if (formHomeworkData) {
              formHomeworkRef.current.setFieldsValue(formHomeworkData);
            } else {
              formHomeworkRef.current.resetFields();
            }
          }
        }}
        initialValues={{
          order: 1,
        }}
        onOpenChange={setModalHomeworkVisit}
        onFinish={async (values) => {
          // 校验表单的 values
          console.log(values);
          // return;
          if ('id' in values) {
            // updateHomeworkById(values);
          } else {
            createHomework({
              ...values,
              deadline: dayjs(values.deadline).toDate(),
            });
          }
          setModalHomeworkVisit(false);
          getData();
          message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText name="coursePlanId" hidden />
        <ProFormText name="order" hidden />
        <ProFormText
          width="md"
          name="name"
          required
          label="作业名称"
          tooltip=""
          placeholder="请输入作业名称"
          rules={[
            {
              required: true,
              message: '请输入作业名称',
            },
          ]}
        />
        <ProFormTextArea
          width="md"
          name="description"
          label="作业要求"
          placeholder="请输入作业要求"
        />
        <ProFormDatePicker
          name="deadline"
          label="截止日期"
          dataFormat="YYYY/MM/DD"
        />
      </ModalForm>

      <ModalForm<AttachmentFormProps>
        {...formConfig}
        title="课件"
        formRef={formAttachmentRef}
        open={modalAttachmentVisit}
        onInit={() => {
          if (formAttachmentRef.current) {
            if (formAttachmentData) {
              formAttachmentRef.current.setFieldsValue(formAttachmentData);
            } else {
              formAttachmentRef.current.resetFields();
            }
          }
        }}
        initialValues={{}}
        onOpenChange={setModalAttachmentVisit}
        onFinish={async (values) => {
          // 校验表单的 values
          console.log(values);
          const attachments = parseUploadFileToUpsertUploadFile(
            values.attachments,
          ).map((item) => ({
            ...item,
            name: values.name,
          }));
          if ('id' in values) {
            console.log('>>>1');
            // updateHomeworkById(values);
          } else {
            console.log('>>>2');
            await createAttachment({
              ...values,
              attachments,
            });
          }
          setModalAttachmentVisit(false);
          getData();
          message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText name="coursePlanId" hidden />
        <ProFormText
          width="md"
          name="name"
          required
          label="课件名称"
          tooltip=""
          placeholder="请输入课件名称"
          rules={[
            {
              required: true,
              message: '请输入课件名称',
            },
          ]}
        />
        <ProFormUploadDragger
          width="md"
          label="附件"
          name="attachments"
          max={1}
          fieldProps={{
            name: 'file',
          }}
          action="/api/upload"
        />
      </ModalForm>
      <SubmissionListModal
        open={modalSubmissionList.open}
        homeworkId={modalSubmissionList.homeworkId}
        onCancel={() => {
          setModalSubmissionList({
            open: false,
            homeworkId: '',
          });
        }}
      />
    </div>
  );
};

export default ClassList;
