import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/validate-request';
import { Login } from './login';

export const metadata = {
  title: '登录',
  description: '登录页面',
};

export default async function LoginPage() {
  const { user } = await validateRequest();

  if (user) redirect('/');

  return <Login />;
}
