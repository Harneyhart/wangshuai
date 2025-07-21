import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/validate-request';
import { checkIsTeacher, checkIsStudent } from '@/lib/course/actions';
import { Login } from './login';

export const metadata = {
  title: '登录',
  description: '登录页面',
};

export default async function LoginPage() {
  const { user } = await validateRequest();

  if (user) {
    // 根据用户角色跳转到不同页面
    const isTeacher = await checkIsTeacher(user.id);
    const isStudent = await checkIsStudent(user.id);

    if (isTeacher) {
      redirect('/admin_teacher');
    } else if (isStudent) {
      redirect('/admin_student');
    } else if (user.isAdmin) {
      redirect('/adminstator');
    } else {
      redirect('/');
    }
  }

  return <Login />;
}
