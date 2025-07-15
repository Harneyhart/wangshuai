'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';

import { validateRequest } from '@/lib/auth/validate-request';
import { changePasswordByUser } from '@/lib/auth/actions';
import type { User } from 'lucia';

export default function ChangePassword() {
  const router = useRouter();
  const [state, formAction] = useFormState(changePasswordByUser, null);
  const [userInfo, setUserInfo] = useState<User>();
  const list = [
    {
      label: '原始密码',
      type: 'password',
      id: 'password',
    },
    {
      label: '新密码',
      type: 'password',
      id: 'newPassword',
    },
    {
      label: '确认密码',
      type: 'password',
      id: 'newPasswordConfirm',
    },
  ];
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
  }, []);
  if (!userInfo) {
    return null;
  }
  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          修改密码
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action={formAction} className="space-y-6">
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">
              账户（学号）
            </label>
            <div className="mt-2">
              <input
                type="text"
                hidden
                name="name"
                defaultValue={userInfo.name}
              />
              <input
                id="name"
                type="text"
                defaultValue={userInfo.name}
                required
                disabled
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
          {list.map((item) => (
            <div key={item.id}>
              <label
                htmlFor={item.id}
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                {item.label}
              </label>
              <div className="mt-2">
                <input
                  id={item.id}
                  name={item.id}
                  type={item.type}
                  required
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
          ))}

          {state?.fieldError ? (
            <ul className="list-disc space-y-1 bg-destructive/10 p-2 text-[0.8rem] font-medium text-destructive">
              {Object.values(state.fieldError).map((err) => (
                <li className="ml-4" key={err}>
                  {err}
                </li>
              ))}
            </ul>
          ) : state?.formError ? (
            <p className="bg-destructive/10 p-2 text-[0.8rem] font-medium text-destructive">
              {state?.formError}
            </p>
          ) : null}

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              修改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
