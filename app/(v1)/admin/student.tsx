'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { message, Popconfirm, Button, List, Tabs, Card, Tag } from 'antd';

import {
  createStudent,
  getAllUsers,
  getAllStudents,
  deleteStudent,
} from '@/lib/course/actions';
import type {
  UserItem,
  StudentsWithUser,
  CreateStudentItem,
} from '@/lib/course/actions';
import { formConfig } from '@/utils/utils';

const StudentList = () => {
  const formStudentRef = useRef<ProFormInstance>();
  const [list, setList] = useState<StudentsWithUser[]>([]);
  const [modalStudentVisit, setModalStudentVisit] = useState(false);
  const getData = async () => {
    const data = await getAllStudents();
    setList(data);
  };
  const handleDelete = async (id: string) => {
    const data = await deleteStudent(id);
    if (data) {
      message.success('删除成功');
      await getData();
    }
  };
  const handleAddStudent = () => {
    setModalStudentVisit(true);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <div className="mb-4">
        <Button type="primary" onClick={handleAddStudent}>
          新建学生
        </Button>
      </div>
      <List
        dataSource={list}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Popconfirm
                key="delete"
                title="确定要删除？"
                description=""
                onConfirm={() => handleDelete(item.id)}
                // onCancel={cancel}
                okText="Yes"
                cancelText="No"
              >
                <Button type="link">删除</Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta title={item.name} description={item.user.email} />
            <div className="flex-1">
              <p>
                班级：
                {item.classes.map((info) => (
                  <Tag key={info.classId}>{info.class.name}</Tag>
                ))}
              </p>
            </div>
          </List.Item>
        )}
      />

      <ModalForm<CreateStudentItem>
        {...formConfig}
        formRef={formStudentRef}
        open={modalStudentVisit}
        onOpenChange={setModalStudentVisit}
        onFinish={async (values) => {
          console.log(values);
          createStudent(values);
          getData();
          setModalStudentVisit(false);
          message.success('提交成功');
        }}
        params={{}}
      >
        <ProFormSelect
          label="选择用户"
          width="md"
          required
          request={async () => {
            const data = await getAllUsers();
            return data.map((user: UserItem) => {
              return {
                value: user.id,
                label: user.email,
              };
            });
          }}
          name="userId"
        />
        <ProFormText
          width="md"
          name="name"
          required
          label="学生姓名"
          tooltip=""
          placeholder="请输入姓名"
        />
      </ModalForm>
    </div>
  );
};

export default StudentList;
