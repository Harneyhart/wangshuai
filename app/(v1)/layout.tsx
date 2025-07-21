import { redirect } from 'next/navigation';

import { validateRequest } from '@/lib/auth/validate-request';

const Layout = async ({ children }: React.PropsWithChildren) => {
  const { user } = await validateRequest();
  console.log('user', user);
  // TODO:
  // if (!user) redirect('/login');
  return <div>{children}</div>;
};

export default Layout;
