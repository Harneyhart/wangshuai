'use client';

import { useState, useEffect } from 'react';
import { Button, Form, Input, List } from 'antd';
import type { FormProps } from 'antd';

import { getAllPosts, createPost, FieldType } from '@/lib/notes/actions';
import { DemoNotesSelect } from '@/lib/db/schema';

type CreateProps = {
  userId?: string;
};
const Create: React.FC<CreateProps> = ({ userId = '' }) => {
  const [posts, setPosts] = useState<DemoNotesSelect[]>([]);

  const getData = async () => {
    const data = await getAllPosts(userId);
    setPosts(data);
  };
  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    console.log('Success:', values);
    const data = await createPost(values);
    console.log('data', data);
    getData();
  };

  const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (
    errorInfo,
  ) => {
    console.log('Failed:', errorInfo);
  };
  useEffect(() => {
    getData();
  }, []);
  return (
    <div>
      <List
        // pagination={{ position, align }}
        dataSource={posts}
        renderItem={(item, index) => (
          <List.Item>
            <List.Item.Meta title={item.title} description={item.text} />
          </List.Item>
        )}
      />
      <Form
        name="basic"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        initialValues={{ user_id: userId }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item name="user_id" hidden />
        <Form.Item<FieldType>
          label="标题"
          name="title"
          rules={[{ required: true, message: 'Please input title!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item<FieldType>
          label="内容"
          name="text"
          rules={[{ required: true, message: 'Please input text!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Create;
