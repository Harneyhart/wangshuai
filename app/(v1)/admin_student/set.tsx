'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Input, message, Card, Space } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';

import { validateRequest } from '@/lib/auth/validate-request';
import { changePasswordByUser, logout } from '@/lib/auth/actions';
import type { User } from 'lucia';

interface PasswordFormData {
  password: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export default function StudentPasswordSettings() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [userInfo, setUserInfo] = useState<User>();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const getUserInfo = async () => {
      const { user } = await validateRequest();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserInfo(user);
    };
    getUserInfo();
  }, [router]);

  const handlePasswordChange = async (values: PasswordFormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', userInfo?.name || '');
      formData.append('password', values.password);
      formData.append('newPassword', values.newPassword);
      formData.append('newPasswordConfirm', values.newPasswordConfirm);

      const result = await changePasswordByUser(undefined, formData);
      
      if (result?.fieldError || result?.formError) {
        // 显示错误信息
        if (result.fieldError) {
          Object.values(result.fieldError).forEach((error) => {
            if (error) message.error(error);
          });
        }
        if (result.formError) {
          message.error(result.formError);
        }
        return;
      }

      message.success('密码修改成功！即将跳转到登录页面...');
      setIsModalVisible(false);
      form.resetFields();
      
      // 清除用户会话并跳转到登录页面
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('修改密码失败:', error);
      message.error('修改密码失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card title="设置" className="shadow-lg">
          <div className="space-y-6">
            {/* 用户信息显示 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <UserOutlined className="text-blue-500 text-xl" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    当前用户信息
                  </h3>
                  <p className="text-gray-600">
                    学号：{userInfo.name}
                  </p>
                  <p className="text-gray-600">
                    邮箱：{userInfo.email}
                  </p>
                </div>
              </div>
            </div>

            {/* 设置选项 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                账户设置
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <LockOutlined className="text-green-500 text-xl" />
                  <div>
                    <h4 className="font-medium text-gray-900">修改登录密码</h4>
                    <p className="text-sm text-gray-500">
                      设置新的登录密码，提高账户安全性
                    </p>
                  </div>
                </div>
                <Button 
                  type="primary" 
                  onClick={showModal}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  修改密码
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 修改密码弹窗 */}
        {isModalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold mb-4 text-center">
                修改密码
              </h2>
              
              <Form
                form={form}
                layout="vertical"
                onFinish={handlePasswordChange}
                autoComplete="off"
              >
                <Form.Item
                  name="password"
                  label="当前密码"
                  rules={[
                    { required: true, message: '请输入当前密码' },
                    { min: 6, message: '密码至少6位' },
                    { max: 18, message: '密码最多18位' }
                  ]}
                >
                  <Input.Password 
                    placeholder="请输入当前密码"
                    prefix={<LockOutlined />}
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码至少6位' },
                    { max: 18, message: '密码最多18位' },
                    {
                      pattern: /^(?=.*[a-zA-Z])(?=.*\d)/,
                      message: '密码必须包含字母和数字'
                    }
                  ]}
                >
                  <Input.Password 
                    placeholder="请输入新密码（6-18位）"
                    prefix={<LockOutlined />}
                  />
                </Form.Item>

                <Form.Item
                  name="newPasswordConfirm"
                  label="确认新密码"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '请确认新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    placeholder="请再次输入新密码"
                    prefix={<LockOutlined />}
                  />
                </Form.Item>

                <div className="flex space-x-3 mt-6">
                  <Button 
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                  >
                    确认修改
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
