"use client";

import { useState, useEffect, useRef } from "react";
import type { ProFormInstance } from "@ant-design/pro-components";
import {
  ModalForm,
  ProFormText,
  ProFormSelect,
} from "@ant-design/pro-components";
import { message, Popconfirm, Button, Table, Space, Tag, Input } from "antd";
import type { ColumnsType } from 'antd/es/table';

import { getAllTeachers, deleteTeacher, getAllCourses, getAllClasses, createCoursePlan, createCourseHour, resetTeacherPassword } from "@/lib/course/actions";
import { signup } from "@/lib/auth/actions";
import type { TeachersWithUser, CreateCoursePlanItem, CreateCourseHourItem } from "@/lib/course/actions";
import { formConfig } from "@/utils/utils";

interface SignupState {
  fieldError?: Record<string, string>;
  formError?: string;
}

interface TeacherTableItem {
  key: string;
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  createdAt?: Date;
}

const TeacherList = () => {
  const formTeacherRef = useRef<ProFormInstance>();
  const formEditRef = useRef<ProFormInstance>();
  const [list, setList] = useState<TeachersWithUser[]>([]);
  const [modalTeacherVisit, setModalTeacherVisit] = useState(false);
  const [modalEditVisit, setModalEditVisit] = useState(false);
  const [error, setError] = useState<SignupState | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<TeachersWithUser | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredList, setFilteredList] = useState<TeachersWithUser[]>([]);

  const getData = async () => {
    setLoading(true);
    try {
      const data = await getAllTeachers();
      setList(data);
      setFilteredList(data);
    } catch (error) {
      console.error('获取教师数据失败:', error);
      message.error('获取教师数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getCoursesAndClasses = async () => {
    try {
      const [coursesData, classesData] = await Promise.all([
        getAllCourses(),
        getAllClasses()
      ]);
      setCourses(coursesData);
      setClasses(classesData);
    } catch (error) {
      console.error('获取课程和班级数据失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const data = await deleteTeacher(id);
      if (data) {
        message.success("删除成功");
        await getData();
      }
    } catch (error) {
      console.error('删除教师失败:', error);
      message.error('删除教师失败');
    }
  };

  const handleAddTeacher = () => {
    setModalTeacherVisit(true);
    setError(null);
  };

  const handleEditTeacher = (teacher: TeachersWithUser) => {
    setCurrentTeacher(teacher);
    setModalEditVisit(true);
  };

  useEffect(() => {
    getData();
    getCoursesAndClasses();
  }, []);

  const handleFinish = async (values: any) => {
    setError(null);
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("real", values.real);
    formData.append("email", values.email);
    formData.append("password", values.password);
    formData.append("type", "teacher");
    const result = await signup(undefined, formData);
    if (result?.fieldError || result?.formError) {
      setError(result);
      return false;
    }
    await getData();
    message.success("教师创建成功");
    setModalTeacherVisit(false);
    return true;
  };

  const handleEditFinish = async (values: any) => {
    if (!currentTeacher) return false;

    try {
      //1 创建课程计划 (course_plans)
      const coursePlanData: CreateCoursePlanItem = {
        courseId: values.courseId,
        classId: values.classId,
        year: new Date().getFullYear(),
        semester: 1, // 默认第一学期
      };
      
      const coursePlan = await createCoursePlan(coursePlanData);
      if (!coursePlan) {
        message.error('创建课程计划失败');
        return false;
      }

      //2. 创建课程小时 (course_hours)
      const courseHourData: CreateCourseHourItem = {
        coursePlanId: coursePlan[0].id,
        classRoom: values.classRoom,
        startTime: new Date(), // 默认时间，后续教师端可修改
        endTime: new Date(), // 默认时间，后续教师端可修改
        teachers: [currentTeacher.id], // 分配当前教师
      };

      const courseHour = await createCourseHour(courseHourData);
      if (!courseHour) {
        message.error('创建课程小时失败');
        return false;
      }

      message.success("教师课程分配成功");
      setModalEditVisit(false);
      setCurrentTeacher(null);
      return true;
    } catch (error) {
      console.error('分配课程失败:', error);
      message.error('分配课程失败');
      return false;
    }
  };

  const handleResetPassword = async (teacherId: string) => {
    try {
      await resetTeacherPassword(teacherId);
      message.success("密码重置成功，新密码为：123456789");
    } catch (error) {
      console.error('重置密码失败:', error);
      message.error('重置密码失败');
    }
  };

  // 搜索处理函数
  const handleSearch = (value: string) => {
    // console.log(value);
    // setSearchText(value);
    if (!value.trim()) {
      setFilteredList(list);
    } else {
      const filtered = list.filter(teacher => 
        teacher.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredList(filtered);
    }
  };

  // 表格列定义
  const columns: ColumnsType<TeacherTableItem> = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      align: 'center',
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '教师姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '登录账号',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (text: string, record: TeacherTableItem) => (
        <span>
          {record.username || '无账号信息'}
        </span>
      ),
    },
    {
      title: '邮箱地址',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    // {
    //   title: '登录密码',
    //   dataIndex: 'password',
    //   key: 'password',
    //   width: 150,
    //   render: (text: string) => (
    //     <span style={{ 
    //       backgroundColor: '#f5f5f5', 
    //       padding: '2px 6px', 
    //       borderRadius: '4px',
    //       fontSize: '12px'
    //     }}>
    //       {text}
    //     </span>
    //   ),
    // },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: Date) => (
        <span>
          {date ? new Date(date).toLocaleDateString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      align: 'center',
      render: (_: any, record: TeacherTableItem) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            onClick={() => handleEditTeacher(list.find(t => t.id === record.id)!)}
            style={{ color: '#1890ff' }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要重置这位教师的密码吗？"
            description="密码将被重置为：123456789"
            onConfirm={() => handleResetPassword(record.id)}
            okText="确定"
            cancelText="取消"
            okType="default"
          >
            <Button 
              type="link" 
              size="small"
              style={{ color: '#faad14' }}
            >
              重置密码
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定要删除这位教师吗？"
            description="删除后将无法恢复，请谨慎操作"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Button 
              type="link" 
              size="small" 
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 转换数据格式
  const tableData: TeacherTableItem[] = filteredList.map((teacher, index) => ({
    key: teacher.id,
    id: teacher.id,
    name: teacher.name,
    username: teacher.user?.name || '无账号信息',
    email: teacher.user?.email || '无邮箱信息',
    password: teacher.user?.hashedPassword || '无密码信息',
    createdAt: teacher.user?.createdAt,
  }));

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            教师管理
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
            管理系统中的所有教师账号
          </p>
        </div>
        <Button 
          type="primary" 
          size="small"
          onClick={handleAddTeacher}
          style={{ 
            backgroundColor: 'blue', 
            borderColor: '#722ed1',
            height: '40px',
            padding: '0 24px'
          }}
        >
          新建教师
        </Button>
      </div>

      <div style={{ 
        backgroundColor: '#fff', 
        padding: 24, 
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="请输入教师姓名进行搜索"
            allowClear
            enterButton="搜索"
            size="middle"
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          pagination={{
            current: 1,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => {
              if (searchText) {
                return `显示第 ${range[0]}-${range[1]} 条，共 ${total} 条搜索结果`;
              }
              return `共 ${total} 位教师`;
            },
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 1000 }}
          size="middle"
          bordered
          rowClassName={(record, index) => 
            index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
          }
        />
      </div>

      {/* 新建教师弹窗 */}
      <ModalForm
        {...formConfig}
        title="新建教师"
        formRef={formTeacherRef}
        open={modalTeacherVisit}
        onOpenChange={setModalTeacherVisit}
        onFinish={handleFinish}
        params={{}}
      >
        <ProFormText
          width="md"
          name="name"
          required
          label="用户名"
          tooltip="教师登录用户名"
          placeholder="请输入用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' }
          ]}
        />
        <ProFormText
          width="md"
          name="real"
          required
          label="教师姓名"
          tooltip="教师真实姓名"
          placeholder="请输入教师姓名"
          rules={[
            { required: true, message: '请输入教师姓名' }
          ]}
        />
        <ProFormText
          width="md"
          name="email"
          required
          label="邮箱"
          tooltip="教师邮箱地址"
          placeholder="请输入邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        />
        <ProFormText.Password
          width="md"
          name="password"
          required
          label="密码"
          tooltip="登录密码，至少8位"
          placeholder="请输入密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码至少8位' }
          ]}
        />
        {/* 显示错误信息 */}
        {error?.fieldError ? (
          <div className="mt-4">
            <ul className="list-disc space-y-1 bg-red-50 text-sm text-red-600 rounded">
              {Object.values(error.fieldError).map((err) => (
                <li className="ml-4" key={err}>{err}</li>
              ))}
            </ul>
          </div>
        ) : error?.formError ? (
          <div className="mt-4">
            <p className="bg-red-50 text-sm text-red-600 rounded">{error.formError}</p>
          </div>
        ) : null}
      </ModalForm>

      {/* 编辑教师弹窗 */}
      <ModalForm
        {...formConfig}
        title={`为 ${currentTeacher?.name} 分配课程`}
        formRef={formEditRef}
        open={modalEditVisit}
        onOpenChange={setModalEditVisit}
        onFinish={handleEditFinish}
        params={{}}
      >
        <ProFormSelect
          label="选择课程"
          width="md"
          required
          name="courseId"
          placeholder="请选择课程"
          rules={[{ required: true, message: '请选择课程' }]}
          request={async () => {
            return courses.map((course) => ({
              value: course.id,
              label: course.name,
            }));
          }}
        />
        <ProFormSelect
          label="选择班级"
          width="md"
          required
          name="classId"
          placeholder="请选择班级"
          rules={[{ required: true, message: '请选择班级' }]}
          request={async () => {
            return classes.map((cls) => ({
              value: cls.id,
              label: cls.name,
            }));
          }}
        />

        <ProFormText
          width="md"
          name="classRoom"
          required
          label="教室"
          placeholder="请输入教室"
          rules={[{ required: true, message: '请输入教室' }]}
        />
      </ModalForm>
    </div>
  );
};

export default TeacherList; 