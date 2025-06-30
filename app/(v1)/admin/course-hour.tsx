'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import type {
  ModalFormProps,
  ProFormInstance,
  ProLayoutProps,
} from '@ant-design/pro-components';
import { Book } from '@phosphor-icons/react';
import Link from 'next/link';
import {
  ProCard,
  ProForm,
  ModalForm,
  ProFormCascader,
  ProFormDatePicker,
  ProFormDateRangePicker,
  ProFormDateTimeRangePicker,
  ProFormDigit,
  ProFormList,
  ProFormMoney,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormTreeSelect,
  ProFormFieldSet,
  ProFormUploadButton,
  ProFormUploadDragger,
  ProFormRadio,
} from '@ant-design/pro-components';
import {
  Col,
  Row,
  Space,
  message,
  Popconfirm,
  Button,
  List,
  Tabs,
  Card,
  Tag,
  Table,
  Descriptions,
  Popover,
  Upload,
} from 'antd';
import type {
  TabsProps,
  DescriptionsProps,
  TableProps,
  UploadProps,
  UploadFile,
  GetProps,
  DatePicker,
} from 'antd';

import {
  createStudent,
  getAllUsers,
  getAllStudents,
  getAllTeachers,
  createTeacher,
  deleteStudent,
  deleteTeacher,
  createCourse,
  getAllCourses,
  // updateCourseById,
  createUser,
  deleteUser,
  deleteHomeworkByCourseId,
  createHomework,
  updateHomeworkById,
  deleteCourse,
  updateCourseById,
  getAllClasses,
  createClass,
  deleteClass,
  createCoursePlan,
  getAllCourseHours,
  getAllCoursePlans,
  getCoursePlansByClassId,
  updateCourseHourById,
  createCourseHour,
  deleteCourseHour,
} from '@/lib/course/actions';
import type {
  UserItem,
  StudentsWithUser,
  TeachersWithUser,
  TeacherItem,
  CreateCourseItem,
  // UpdateCourseItem,
  CreateStudentItem,
  CoursesWithPlan,
  CreateHomeworkItem,
  UpdateHomeworkItem,
  CreateAttachmentItem,
  CreateUserItem,
  CreateClassItem,
  ClassesWithStudents,
  CreateCoursePlanItem,
  CreateCourseHourItem,
  CourseHoursWithRelations,
  CoursePlansWithRelations,
} from '@/lib/course/actions';
import type { UploadFileItem } from '@/app/api/upload/route';
import {
  StudentSelect,
  TeacherSelect,
  UserSelect,
  HomeworkInsert,
  CourseHourSelect,
} from '@/lib/db/schema';
import { parseAttachmentToUploadFile, renderCoverUrl } from '@/utils/utils';

import { formConfig } from '@/utils/utils';

const range = (start: number, end: number) => {
  const result = [];
  for (let i = start; i < end; i++) {
    result.push(i);
  }
  return result;
};
const disabledMinutes = () => {
  let disabled = [];
  for (let i = 0; i < 60; i++) {
    if (i % 10 !== 0) {
      disabled.push(i);
    }
  }
  return disabled;
};
type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;
const disabledRangeTime: RangePickerProps['disabledTime'] = (
  _: any,
  type: any,
) => {
  if (type === 'start') {
    return {
      disabledHours: () => [...range(0, 8), ...range(22, 24)],
      disabledMinutes,
    };
  }
  return {
    disabledHours: () => [...range(0, 7), ...range(22, 24)],
    disabledMinutes,
  };
};

const CourseHourV1 = () => {
  const formCourseHourRef = useRef<ProFormInstance>();
  const formHomeworkRef = useRef<ProFormInstance>();
  const formAttachmentRef = useRef<ProFormInstance>();

  const [formCourseHourData, setFormCourseHourData] =
    useState<CreateCourseHourItem>();
  const [formHomeworkData, setFormHomeworkData] =
    useState<CreateHomeworkItem>();
  const [formAttachmentData, setFormAttachmentData] =
    useState<CreateAttachmentItem>();
  // const [descItems, setDescItems] = useState<DescriptionsProps['items']>([]);
  // const [homeworkData, setHomeworkData] = useState<TableProps['dataSource']>([]);
  const [modalCourseHourVisit, setModalCourseHourVisit] = useState(false);
  const [modalHomeworkVisit, setModalHomeworkVisit] = useState(false);
  const [modalAttachmentVisit, setModalAttachmentVisit] = useState(false);
  const [list, setList] = useState<any[]>([]);

  const homeworkColumns: TableProps['columns'] = [
    {
      title: '作业名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '作业要求',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '截止日期',
      width: 130,
      key: 'deadline',
      render: (_, record) => (
        <span>{dayjs(record.deadline).format('YYYY-MM-DD')}</span>
      ),
    },
    {
      title: '学生作业',
      key: 'submissions',
      render: (_, record) => (
        <ul>
          {record.submissions.map((item: any) => (
            <li key={item.id}>
              <Popover content={item.text} title="作业内容">
                <Tag>{item.student ? item.student.name : '-'}</Tag>
              </Popover>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            key="delete"
            title="确定要删除？"
            description=""
            onConfirm={() => handleDeleteHomework(record.id)}
            // onCancel={cancel}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const attachmentColumns: TableProps['columns'] = [
    {
      title: '课件名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '课件内容',
      key: 'data',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm
            key="delete"
            title="确定要删除？"
            description=""
            onConfirm={() => handleDeleteHomework(record.id)}
            // onCancel={cancel}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getData = async () => {
    const data = await getAllCourses();
    setList(data);
  };
  const handleDeleteCourseHour = async (id: string) => {
    const data = await deleteCourse(id);
    if (data) {
      message.success('删除成功');
      await getData();
    }
  };
  const handleDeleteHomework = async (id: string) => {
    const data = await deleteHomeworkByCourseId(id);
    if (data) {
      message.success('删除成功');
      await getData();
    }
  };
  const handleAddCourseHour = () => {
    // setFormCourseHourData({
    //   id: '',
    //   coursePlanId: '',
    //   classRoom: '',
    //   teachers: [],
    //   assistants: [],
    //   operators: [],
    // });
    setModalCourseHourVisit(true);
  };
  const handleAddHomework = (coursePlanId: string) => {
    setFormHomeworkData({
      coursePlanId,
      name: '',
      description: '',
      order: 1,
      deadline: new Date(),
    });
    setModalHomeworkVisit(true);
  };
  const handleAddAttachment = (courseId: string) => {
    console.log('courseId', courseId);
    /*
    setFormAttachmentData({
      courseId,
      name: '',
    });
    */
    setModalAttachmentVisit(true);
  };
  const handleEditCourseHour = (item: CourseHourSelect) => {
    // console.log('item', item);
    // const { teachersToCourses, assistantsToCourses, studentsToCourses } = item;
    // const data: CreateCourseItem = {
    //   ...item,
    //   cover: item.cover || '',
    //   attachments: item.attachments.map((item) => item.id),
    //   // attachments: '',
    //   teachers: teachersToCourses.map((item) => item.teacher.id),
    //   assistants: assistantsToCourses.map((item) => item.teacher.id),
    //   students: studentsToCourses.map((item) => item.student.id),
    // };
    // console.log('data', data);
    // setFormCourseHourData(data);
    // setModalCourseHourVisit(true);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div className="mb-4">
      <div className="mb-4">
        <Button type="primary" onClick={handleAddCourseHour}>
          新建排课
        </Button>
      </div>
      <List
        itemLayout="vertical"
        bordered
        dataSource={list}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                onClick={() => handleEditCourseHour(item)}
                type="link"
              >
                编辑排课
              </Button>,
              <Popconfirm
                key="delete"
                title="确定要删除？"
                description=""
                onConfirm={() => handleDeleteCourseHour(item.id)}
                // onCancel={cancel}
                okText="Yes"
                cancelText="No"
              >
                <Button type="text" danger>
                  删除排课
                </Button>
              </Popconfirm>,
            ]}
            extra={
              <img width={272} alt="logo" src={renderCoverUrl(item.cover)} />
            }
          >
            <List.Item.Meta
              title={
                <div className="flex gap-x-2 items-center">
                  <Book size={18} />
                  {item.name}
                </div>
              }
              description={item.description}
            />
            <Link className="" target="_blank" href={`/course/${item.id}`}>
              {`${window.location.origin}/course/${item.id}`}
            </Link>
            <ul className="mt-4 mb-4">
              {/* <li>
                老师：
                {item.teachersToCourses.map((item) => (
                  <Tag key={item.teacher.id}>{item.teacher.name}</Tag>
                ))}
              </li>
              <li>
                助教：
                {item.assistantsToCourses.map((item) => (
                  <Tag key={item.teacher.id}>{item.teacher.name}</Tag>
                ))}
              </li>
              <li>
                学生：
                {item.studentsToCourses.map((item) => (
                  <Tag key={item.student.id}>{item.student.name}</Tag>
                ))}
              </li> */}
            </ul>
            <Table
              className="mb-4"
              title={() => (
                <div className="flex justify-between">
                  <p>课件列表</p>
                  <Button
                    type="primary"
                    onClick={() => handleAddAttachment(item.id)}
                  >
                    添加课件
                  </Button>
                </div>
              )}
              bordered
              size="small"
              columns={attachmentColumns}
              // dataSource={item.attachments.map((attachment) => {
              //   return {
              //     ...attachment,
              //     key: attachment.id,
              //   };
              // })}
            />
            <Table
              title={() => (
                <div className="flex justify-between">
                  <p>作业列表</p>
                  <Button
                    type="primary"
                    onClick={() => handleAddHomework(item.id)}
                  >
                    添加作业
                  </Button>
                </div>
              )}
              bordered
              size="small"
              columns={homeworkColumns}
              // dataSource={item.homeworks.map((work) => {
              //   return {
              //     ...work,
              //     key: work.id,
              //   };
              // })}
            />
          </List.Item>
        )}
      />

      <ModalForm<CreateAttachmentItem & { files: UploadFile[] }>
        formRef={formAttachmentRef}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        layout="horizontal"
        modalProps={{
          destroyOnClose: true,
          width: 600,
          onCancel: () => console.log('run'),
        }}
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
          const attachments: CreateAttachmentItem['attachments'] =
            values.files.map((file: UploadFile) => {
              return {
                name: values.name,
                ...file.response.data,
              };
            });
          console.log('attachments', attachments);
          setModalAttachmentVisit(false);
          getData();
          message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText name="courseId" hidden />
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
          label="附件"
          name="files"
          fieldProps={{
            name: 'file',
          }}
          action="/api/upload"
        />
      </ModalForm>
      <ModalForm<CreateHomeworkItem | UpdateHomeworkItem>
        formRef={formHomeworkRef}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        layout="horizontal"
        modalProps={{
          destroyOnClose: true,
          width: 600,
          onCancel: () => console.log('run'),
        }}
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
            updateHomeworkById(values);
          } else {
            createHomework(values);
          }
          setModalHomeworkVisit(false);
          getData();
          message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormText name="courseId" hidden />
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
          required
          label="作业要求"
          placeholder="请输入作业要求"
          // fieldProps={inputTextAreaProps}
          rules={[
            {
              required: true,
              message: '请输入作业要求',
            },
          ]}
        />
        <ProFormDatePicker
          name="deadline"
          label="截止日期"
          dataFormat="YYYY/MM/DD"
        />
      </ModalForm>
      <ModalForm<CreateCourseHourItem>
        {...formConfig}
        formRef={formCourseHourRef}
        open={modalCourseHourVisit}
        onInit={() => {
          if (formCourseHourRef.current) {
            if (formCourseHourData) {
              formCourseHourRef.current.setFieldsValue(formCourseHourData);
            } else {
              formCourseHourRef.current.resetFields();
            }
          }
        }}
        onOpenChange={setModalCourseHourVisit}
        onFinish={async (values) => {
          // 校验表单的 values
          console.log(values);
          // if ('id' in values) {
          //   updateCourseById(values);
          // } else {
          //   createCourse(values);
          // }
          // setModalCourseVisit(false);
          getData();
          message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormSelect
          label="选择课程"
          width="md"
          required
          showSearch={false}
          mode="multiple"
          request={async () => {
            const data = await getAllCourses();
            return data.map((course: CoursesWithPlan) => {
              return {
                value: course.id,
                label: course.name,
              };
            });
          }}
          name="teachers"
        />
        <ProFormDateTimeRangePicker
          label="上课时间"
          width="md"
          required
          name="rangeTime"
          placeholder="请输入上课时间"
        />
        <ProFormText
          width="md"
          name="classRoom"
          required
          label="教室"
          tooltip=""
          placeholder="请输入教室"
          rules={[
            {
              required: true,
              message: '请输入教室',
            },
          ]}
        />
        <ProFormSelect
          label="老师"
          width="md"
          showSearch={false}
          mode="multiple"
          request={async () => {
            const data = await getAllTeachers();
            return data.map((teacher: TeachersWithUser) => {
              return {
                value: teacher.id,
                label: teacher.name,
              };
            });
          }}
          name="teachers"
        />
        <ProFormSelect
          label="实验老师"
          width="md"
          showSearch={false}
          mode="multiple"
          request={async () => {
            const data = await getAllTeachers();
            return data.map((teacher: TeachersWithUser) => {
              return {
                value: teacher.id,
                label: teacher.name,
              };
            });
          }}
          name="operators"
        />
        <ProFormSelect
          label="助教"
          width="md"
          showSearch={false}
          mode="multiple"
          request={async () => {
            const data = await getAllTeachers();
            return data.map((teacher: TeachersWithUser) => {
              return {
                value: teacher.id,
                label: teacher.name,
              };
            });
          }}
          name="assistants"
        />
        <ProFormUploadDragger
          max={9}
          width="md"
          label="附件"
          name="attachments"
          action="upload.do"
        />
      </ModalForm>
    </div>
  );
};

// type CreateCourseHourForm = Pick<
//   CreateCourseHourItem,
//   'id' | 'classRoom' | 'teachers' | 'operators' | 'assistants' | 'coursePlanId'
// > & {
//   rangeTime: [string, string];
// };

type EditFormFields = Pick<
  CreateCourseHourItem,
  'id' | 'assistants' | 'classRoom' | 'coursePlanId' | 'operators' | 'teachers'
> & { classId: string; rangeTime: [string, string] };

const CourseHour = () => {
  const formCourseHourRef = useRef<ProFormInstance>();
  const [formCourseHourData, setFormCourseHourData] =
    useState<EditFormFields>();
  const [modalCourseHourVisit, setModalCourseHourVisit] = useState(false);
  const [editModalInfo, setEditModalInfo] = useState<null | EditFormFields>(
    null,
  );
  const [list, setList] = useState<CourseHoursWithRelations[]>([]);

  const courseHourColumns: TableProps<CourseHoursWithRelations>['columns'] = [
    {
      title: '课程',
      // dataIndex: 'name',
      dataIndex: ['plan', 'course', 'name'],
      key: 'name',
    },
    {
      title: '班级',
      dataIndex: ['plan', 'class', 'name'],
      key: 'class',
    },
    {
      title: '时间',
      key: 'time',
      render: (_, record) => (
        <span>
          {dayjs(record.startTime).format('YYYY-MM-DD HH:mm')} ~{' '}
          {dayjs(record.endTime).format('YYYY-MM-DD HH:mm')}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            onClick={() => {
              setFormCourseHourData({
                id: record.id,
                assistants: record.assistants.map((i) => i.assistantId),
                classRoom: record.classRoom,
                coursePlanId: record.coursePlanId,
                operators: record.operators.map((i) => i.operatorId),
                teachers: record.teachers.map((i) => i.teacherId),
                classId: record.plan.classId,
                rangeTime: [
                  dayjs(record.startTime).format('YYYY-MM-DD HH:mm:ss'),
                  dayjs(record.endTime).format('YYYY-MM-DD HH:mm:ss'),
                ],
              });
              setModalCourseHourVisit(true);
            }}
          >
            编辑
          </Button>
          <Link target="_blank" href={`/course/hour/${record.id}`}>
            查看
          </Link>
          <Popconfirm
            key="delete"
            title="确定要删除？"
            description=""
            onConfirm={() => handleDeleteCourseHour(record.id)}
            // onCancel={cancel}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAddCourseHour = () => {
    setModalCourseHourVisit(true);
  };
  const handleDeleteCourseHour = async (id: string) => {
    await deleteCourseHour(id);
    getData();
  };
  const getData = async () => {
    const data = await getAllCourseHours();
    console.log('data', data);
    setList(data);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <div className="mb-4">
        <Button type="primary" onClick={handleAddCourseHour}>
          新建排课
        </Button>
      </div>
      <Table
        className="mb-4"
        bordered
        size="small"
        rowKey="id"
        columns={courseHourColumns}
        dataSource={list}
      />

      <ModalForm<EditFormFields>
        {...formConfig}
        title={formCourseHourData ? '排课编辑' : '排课'}
        formRef={formCourseHourRef}
        open={modalCourseHourVisit}
        onInit={() => {
          if (formCourseHourRef.current) {
            if (formCourseHourData) {
              formCourseHourRef.current.setFieldsValue(formCourseHourData);
            } else {
              formCourseHourRef.current.resetFields();
            }
          }
        }}
        onOpenChange={(open) => {
          setModalCourseHourVisit(open);
          if (!open) {
            setFormCourseHourData(undefined);
          }
        }}
        onFinish={async (values) => {
          // 校验表单的 values
          console.log(values);
          if ('id' in values) {
            updateCourseHourById({
              ...values,
              startTime: dayjs(values.rangeTime[0]).toDate(),
              endTime: dayjs(values.rangeTime[1]).toDate(),
            });
          } else {
            await createCourseHour({
              ...values,
              startTime: dayjs(values.rangeTime[0]).toDate(),
              endTime: dayjs(values.rangeTime[1]).toDate(),
            });
          }
          setModalCourseHourVisit(false);
          getData();
          message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormText name="id" hidden />
        <ProFormSelect
          label="选择班级"
          width="md"
          required
          request={async () => {
            const data = await getAllClasses();
            return data.map((course: ClassesWithStudents) => {
              return {
                value: course.id,
                label: course.name,
              };
            });
          }}
          name="classId"
        />
        <ProFormSelect
          label="选择课程"
          width="md"
          required
          dependencies={['classId']}
          request={async (params) => {
            if (!params.classId) {
              return [];
            }
            const data = await getCoursePlansByClassId(params.classId);
            return data.map((course: CoursePlansWithRelations) => {
              return {
                value: course.id,
                label: course.course.name,
              };
            });
          }}
          name="coursePlanId"
        />
        <ProFormDateTimeRangePicker
          label="上课时间"
          width="md"
          required
          // TODO:
          name="rangeTime"
          fieldProps={{
            disabledTime: disabledRangeTime,
            showTime: { format: 'HH:mm', hideDisabledOptions: true },
          }}
          placeholder="请输入上课时间"
        />
        <ProFormText
          width="md"
          name="classRoom"
          required
          label="教室"
          tooltip=""
          placeholder="请输入教室"
          rules={[
            {
              required: true,
              message: '请输入教室',
            },
          ]}
        />
        <ProFormSelect
          label="老师"
          width="md"
          showSearch={false}
          mode="multiple"
          request={async () => {
            const data = await getAllTeachers();
            return data.map((teacher: TeachersWithUser) => {
              return {
                value: teacher.id,
                label: teacher.name,
              };
            });
          }}
          name="teachers"
        />
        <ProFormSelect
          label="实验老师"
          width="md"
          showSearch={false}
          mode="multiple"
          request={async () => {
            const data = await getAllTeachers();
            return data.map((teacher: TeachersWithUser) => {
              return {
                value: teacher.id,
                label: teacher.name,
              };
            });
          }}
          name="operators"
        />
        <ProFormSelect
          label="助教"
          width="md"
          showSearch={false}
          mode="multiple"
          request={async () => {
            const data = await getAllTeachers();
            return data.map((teacher: TeachersWithUser) => {
              return {
                value: teacher.id,
                label: teacher.name,
              };
            });
          }}
          name="assistants"
        />
      </ModalForm>
    </div>
  );
};

export default CourseHour;
