'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { signup } from '@/lib/auth/actions';
// import { SubmitButton } from "@/components/submit-button";

type SignupProps = {
  classId?: string;
};
export const Signup: React.FC<SignupProps> = ({ classId }) => {
  const searchParams = useSearchParams();
  let type = 'student';
  if (classId) {
    type = 'student';
  } else if (searchParams.get('type')) {
    type = searchParams.get('type') as string;
  }

  const [state, formAction] = useFormState(signup, null);
  const list = [
    {
      label: '账户（学号）',
      type: 'text',
      id: 'name',
    },
    {
      label: '姓名',
      type: 'text',
      id: 'real',
    },
    {
      label: '邮箱',
      type: 'email',
      id: 'email',
    },
    {
      label: '密码',
      type: 'password',
      id: 'password',
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          注册账户
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" action={formAction}>
          <input type="hidden" name="type" value={type as string} />
          <input type="hidden" name="classId" value={classId} />
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
              注册
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500">
          已经有账户?{' '}
          <Link
            href="/login"
            className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
          >
            登录
          </Link>
        </p>
      </div>
    </div>
  );
  /*
  return (
    <div className="w-full max-w-md">
      <div>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label>Email</label>
            <input
              required
              placeholder="email@example.com"
              autoComplete="email"
              name="email"
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label>Password</label>
            <input
              name="password"
              required
              autoComplete="current-password"
              placeholder="********"
            />
          </div>

          {state?.fieldError ? (
            <ul className="list-disc space-y-1 rounded-lg border bg-destructive/10 p-2 text-[0.8rem] font-medium text-destructive">
              {Object.values(state.fieldError).map((err) => (
                <li className="ml-4" key={err}>
                  {err}
                </li>
              ))}
            </ul>
          ) : state?.formError ? (
            <p className="rounded-lg border bg-destructive/10 p-2 text-[0.8rem] font-medium text-destructive">
              {state?.formError}
            </p>
          ) : null}
          <div>
            <Link href={'/login'}>
              <span className="p-0 text-xs font-medium hover:underline underline-offset-4">
                login.
              </span>
            </Link>
          </div>

          <button className="w-full"> Sign Up</button>
        </form>
      </div>
    </div>
  );
  */
};
