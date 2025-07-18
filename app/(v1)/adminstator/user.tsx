'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProFormInstance } from '@ant-design/pro-components';
import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { message, Popconfirm, Button, List } from 'antd';

import { getAllUsers, createUser, deleteUser } from '@/lib/course/actions';
import type { TeacherItem, CreateUserItem } from '@/lib/course/actions';
import { formConfig } from '@/utils/utils';

const UserList = () => {
  const formUserRef = useRef<ProFormInstance>();
  const [list, setList] = useState<TeacherItem[]>([]);
  const [modalUserVisit, setModalUserVisit] = useState(false);
  const getData = async () => {
    const data = await getAllUsers();
    setList(data);
  };
  const handleDelete = async (id: string) => {
    message.error('暂不支持删除用户');
    return;
    const data = await deleteUser(id);
    if (data) {
      message.success('删除成功');
      await getData();
    }
  };
  const handleAddUser = () => {
    setModalUserVisit(true);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <div className="mb-4">
        <Button type="primary" onClick={handleAddUser}>
          新建用户
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
            <List.Item.Meta title={item.email} description={item.name} />
          </List.Item>
        )}
      />

      <ModalForm<CreateUserItem>
        {...formConfig}
        formRef={formUserRef}
        open={modalUserVisit}
        onOpenChange={setModalUserVisit}
        onFinish={async (values) => {
          console.log(values);
          createUser(values);
          getData();
          message.success('提交成功');
          setModalUserVisit(false);
        }}
        params={{}}
      >
        <ProFormText
          width="md"
          name="name"
          required
          label="账户"
          tooltip=""
          placeholder="请输入用户账户"
        />
        <ProFormText
          width="md"
          name="email"
          required
          label="用户邮箱"
          tooltip=""
          placeholder="请输入用户邮箱"
        />
        <ProFormText.Password
          width="md"
          name="password"
          required
          label="密码"
          tooltip=""
          placeholder="请输入密码"
        />
      </ModalForm>
    </div>
  );
};

export default UserList;
