import { redirect } from 'next/navigation';

import { validateRequest } from '@/lib/auth/validate-request';
import { checkIsStudent } from '@/lib/course/actions';

const Layout = async ({ children }: React.PropsWithChildren) => {
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  
  // 判断是否是学生或管理员，如果不是，跳转到首页
  const isStudent = await checkIsStudent(user.id);
  if (!isStudent && !user.isAdmin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        fontSize: '1.5rem',
        color: '#888'
      }}>
        您没有权限访问该页面
      </div>
    );
  }

  return <div>{children}</div>;
};

export default Layout; 