'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  ModalForm,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import { message, Popconfirm, Button, List } from 'antd';

import {
  getAllUsers,
  getAllTeachers,
  createTeacher,
  deleteTeacher,
} from '@/lib/course/actions';
import type {
  TeacherItem,
  TeachersWithUser,
  CreateTeacherItem,
} from '@/lib/course/actions';

import { formConfig } from '@/utils/utils';

const TeacherList = () => {
  const formTeacherRef = useRef<ProFormInstance>();
  const [list, setList] = useState<TeachersWithUser[]>([]);
  const [modalTeacherVisit, setModalTeacherVisit] = useState(false);
  const getData = async () => {
    const data = await getAllTeachers();
    setList(data);
  };
  const handleDelete = async (id: string) => {
    const data = await deleteTeacher(id);
    if (data) {
      message.success('删除成功');
      await getData();
    }
  };
  const handleAddTeacher = () => {
    setModalTeacherVisit(true);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <div className="mb-4">
        <Button type="primary" onClick={handleAddTeacher}>
          新建老师
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
            <List.Item.Meta title={item.name} description={item.user?.email || '无邮箱信息'} />
          </List.Item>
        )}
      />

      <ModalForm<CreateTeacherItem>
        {...formConfig}
        formRef={formTeacherRef}
        open={modalTeacherVisit}
        onOpenChange={setModalTeacherVisit}
        onFinish={async (values) => {
          console.log(values);
          const { Scrypt } = await import('lucia');
          const hashedPassword = await new Scrypt().hash(values.hashedPassword);
          await createTeacher({
            name: values.name,
            email: values.email,
            hashedPassword,
          });
          await getData();
          message.success('提交成功');
          setModalTeacherVisit(false);
        }}
        params={{}}
      >
        <ProFormText
          width="md"
          name="name"
          required
          label="老师姓名"
          tooltip=""
          placeholder="请输入姓名"
        />
        <ProFormText
          width="md"
          name="email"
          required
          label="邮箱"
          tooltip=""
          placeholder="请输入邮箱"
        />
        <ProFormText.Password
          width="md"
          name="hashedPassword"
          required
          label="密码"
          tooltip=""
          placeholder="请输入密码"
        />
      </ModalForm>
    </div>
  );
};

export default TeacherList;
