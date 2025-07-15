import { redirect } from 'next/navigation';
import { Signup } from './signup';
import { validateRequest } from '@/lib/auth/validate-request';

export const metadata = {
  title: '注册',
  description: '注册页面',
};

export default async function SignupPage() {
  const { user } = await validateRequest();

  if (user) redirect('/');

  return <Signup />;
}
