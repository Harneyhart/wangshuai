'use client';

import React, { useState } from 'react';

import { Button, Modal, Form, Input } from 'antd';

type EditTeacherProps = {
  open: boolean;
  handleOk: () => void;
  handleCancel: () => void;
};

const EditTeacher: React.FC<EditTeacherProps> = ({
  open,
  handleOk,
  handleCancel,
}) => {
  const [form] = Form.useForm();

  return (
    <Modal
      destroyOnClose
      title="添加教师"
      open={open}
      onOk={handleOk}
      okText="保存"
      cancelText="取消"
      onCancel={handleCancel}
    >
      <Form
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 14 }}
        form={form}
        preserve={false}
        initialValues={{}}
        style={{ maxWidth: 600 }}
      >
        <Form.Item label="姓名">
          <Input placeholder="" />
        </Form.Item>
        <Form.Item label="邮箱">
          <Input placeholder="" />
        </Form.Item>
        <Form.Item label="部门">
          <Input placeholder="" />
        </Form.Item>
        <Form.Item label="职称">
          <Input placeholder="" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditTeacher;
