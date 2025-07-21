import { redirect } from 'next/navigation';

import { validateRequest } from '@/lib/auth/validate-request';
import { checkIsTeacher } from '@/lib/course/actions';

const Layout = async ({ children }: React.PropsWithChildren) => {
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  // 判断是否是老师，如果不是老师，跳转到首页
  const isTeacher = await checkIsTeacher(user.id);
  if (!isTeacher && !user.isAdmin) redirect('/');

  return <div>{children}</div>;
};

export default Layout;
