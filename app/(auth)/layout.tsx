import type { ReactNode } from 'react';

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return <div className="p-4">{children}</div>;
};

export default AuthLayout;
