'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { message, Popconfirm, Button, Table, Space, Tag, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import {
  createStudent,
  getAllUsers,
  getAllStudents,
  deleteStudent,
  getAllClasses,
  updateStudentClasses,
  resetStudentPassword,
} from '@/lib/course/actions';
import type {
  TeacherItem,
  StudentsWithUser,
  CreateStudentItem,
} from '@/lib/course/actions';
import { formConfig } from '@/utils/utils';

interface StudentTableItem {
  key: string;
  id: string;
  name: string;
  username: string;
  email: string;
  classes: string;
  createdAt?: Date;
}

const StudentList = () => {
  const formStudentRef = useRef<ProFormInstance>();
  const formEditRef = useRef<ProFormInstance>();
  const [list, setList] = useState<StudentsWithUser[]>([]);
  const [modalStudentVisit, setModalStudentVisit] = useState(false);
  const [modalEditVisit, setModalEditVisit] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentsWithUser | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredList, setFilteredList] = useState<StudentsWithUser[]>([]);

  const getData = async () => {
    setLoading(true);
    try {
      const data = await getAllStudents();
      setList(data);
      setFilteredList(data);
    } catch (error) {
      console.error('获取学生数据失败:', error);
      message.error('获取学生数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getClasses = async () => {
    try {
      const classesData = await getAllClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('获取班级数据失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const data = await deleteStudent(id);
      if (data) {
        message.success('删除成功');
        await getData();
      }
    } catch (error) {
      console.error('删除学生失败:', error);
      message.error('删除学生失败');
    }
  };

  const handleAddStudent = () => {
    setModalStudentVisit(true);
  };

  const handleEditStudent = (student: StudentsWithUser) => {
    setCurrentStudent(student);
    setModalEditVisit(true);
  };

  const handleEditFinish = async (values: any) => {
    if (!currentStudent) return false;

    try {
      await updateStudentClasses(currentStudent.id, values.classIds || []);
      message.success("学生班级分配成功");
      setModalEditVisit(false);
      setCurrentStudent(null);
      await getData(); // 刷新数据
      return true;
    } catch (error) {
      console.error('分配班级失败:', error);
      message.error('分配班级失败');
      return false;
    }
  };

  const handleResetPassword = async (studentId: string) => {
    try {
      await resetStudentPassword(studentId);
      message.success("密码重置成功，新密码为：123456789");
    } catch (error) {
      console.error('重置密码失败:', error);
      message.error('重置密码失败');
    }
  };

  // 搜索处理函数
  const handleSearch = (value: string) => {
    if (!value.trim()) {
      setFilteredList(list);
    } else {
      const filtered = list.filter(student => 
        student.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredList(filtered);
    }
  };

  useEffect(() => {
    getData();
    getClasses();
  }, []);

  // 表格列定义
  const columns: ColumnsType<StudentTableItem> = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 80,
      align: 'center',
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '学生姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '登录账号',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (text: string, record: StudentTableItem) => (
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
    {
      title: '所属班级',
      dataIndex: 'classes',
      key: 'classes',
      width: 200,
      render: (text: string) => {
        if (!text || text === '未分配') {
          return <Tag color="default">未分配</Tag>;
        }
        return text.split(',').map((className, index) => (
          <Tag key={index} color="blue" style={{ marginBottom: '4px' }}>
            {className.trim()}
          </Tag>
        ));
      },
    },
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
      render: (_: any, record: StudentTableItem) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            onClick={() => handleEditStudent(list.find(s => s.id === record.id)!)}
            style={{ color: '#1890ff' }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要重置这位学生的密码吗？"
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
            title="确定要删除这位学生吗？"
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
  const tableData: StudentTableItem[] = filteredList.map((student, index) => ({
    key: student.id,
    id: student.id,
    name: student.name,
    username: student.user?.name || '无账号信息',
    email: student.user?.email || '无邮箱信息',
    classes: student.classes && student.classes.length > 0 
      ? student.classes.map(info => info.class.name).join(', ')
      : '未分配',
    createdAt: student.user?.createdAt,
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
            学生管理
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
            管理系统中的所有学生账号
          </p>
        </div>
        {/* <Button 
          type="primary" 
          size="small"
          onClick={handleAddStudent}
          style={{ 
            backgroundColor: 'blue', 
            borderColor: '#722ed1',
            height: '40px',
            padding: '0 24px'
          }}
        >
          新建学生
        </Button> */}
      </div>

      <div style={{ 
        backgroundColor: '#fff', 
        padding: 24, 
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="请输入学生姓名进行搜索"
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
              return `共 ${total} 位学生`;
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

      {/* 新建学生弹窗 */}
      <ModalForm<CreateStudentItem>
        {...formConfig}
        title="新建学生"
        formRef={formStudentRef}
        open={modalStudentVisit}
        onOpenChange={setModalStudentVisit}
        onFinish={async (values) => {
          try {
            await createStudent(values);
            await getData();
            setModalStudentVisit(false);
            message.success('学生创建成功');
            return true;
          } catch (error) {
            console.error('创建学生失败:', error);
            message.error('创建学生失败');
            return false;
          }
        }}
        params={{}}
      >
        <ProFormSelect
          label="选择用户"
          width="md"
          required
          request={async () => {
            const data = await getAllUsers();
            return data.map((user: TeacherItem) => {
              return {
                value: user.id,
                label: user.email,
              };
            });
          }}
          name="userId"
          placeholder="请选择用户"
          rules={[{ required: true, message: '请选择用户' }]}
        />
        <ProFormText
          width="md"
          name="name"
          required
          label="学生姓名"
          tooltip="学生真实姓名"
          placeholder="请输入学生姓名"
          rules={[
            { required: true, message: '请输入学生姓名' }
          ]}
        />
      </ModalForm>

      {/* 编辑学生弹窗 */}
      <ModalForm
        {...formConfig}
        title={`为 ${currentStudent?.name} 分配班级`}
        formRef={formEditRef}
        open={modalEditVisit}
        onOpenChange={setModalEditVisit}
        onFinish={handleEditFinish}
        params={{}}
      >
        <ProFormSelect
          label="选择班级"
          width="md"
          mode="multiple"
          required
          name="classIds"
          placeholder="请选择班级"
          request={async () => {
            return classes.map((cls) => ({
              value: cls.id,
              label: cls.name,
            }));
          }}
          rules={[{ required: true, message: '请选择班级' }]}
        />
      </ModalForm>
    </div>
  );
};

export default StudentList;
