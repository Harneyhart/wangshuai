'use client';
import { Button } from 'antd';
import { logout } from '@/lib/auth/actions';

const SignOutButton = () => {
  const handleSignOut = async () => {
    await logout();
  };
  return (
    <Button className="text-indigo-500" onClick={handleSignOut}>
      退出
    </Button>
  );
};

export default SignOutButton;
