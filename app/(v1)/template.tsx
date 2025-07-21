'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { BellIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { House, UserCircle } from '@phosphor-icons/react';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

import SignOutButton from '@/components/demo/SignOutButton';

const LogoTitle = () => {
  return (
    <div className="px-2 rounded-md text-xl font-bold bg-indigo-500 text-white logo">
      BioAZ
    </div>
  );
};

const navigation: {
  name: string;
  key: string;
  href: string;
}[] = [
  /*
  {
    name: '课程',
    key: 'course',
    href: `/course`,
  },
  {
    name: '课表',
    key: 'timetable',
    href: `/timetable`,
  },
  {
    name: '班级',
    key: 'class',
    href: `/class`,
  },
  {
    name: '预约',
    key: 'reservation',
    href: `/reservation`,
  },
  */
];

type TemplateProps = {
  children?: React.ReactNode;
};

const Template: React.FC<TemplateProps> = ({ children }) => {
  const pathName = usePathname();
  const router = useRouter();

  useEffect(() => {
    // html 和 body 的 classname 都增加 h-full
    // document.documentElement.classList.add('h-full');
    // document.body.classList.add('h-full');
  }, []);
  useEffect(() => {}, [pathName]);
  return (
    <>
      <div className="fixed w-full left-0 top-0 z-10">
        <nav className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex gap-x-2 sm:gap-x-10">
                <div className="flex flex-shrink-0 items-center">
                  <LogoTitle />
                </div>
                <div className="ml-2 sm:ml-6 flex space-x-3 sm:space-x-8">
                  {/* Current: "border-indigo-500 text-gray-900", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" */}
                  {navigation.map((item) => (
                    <Link
                      href={item.href}
                      className={clsx(
                        'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        pathName === item.href
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent',
                      )}
                      key={item.key}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="ml-6 flex items-center gap-x-4">
                <button
                  type="button"
                  className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">View notifications</span>
                  <BellIcon className="h-6 w-6" aria-hidden="true" />
                </button>

                {/* Profile dropdown */}
                <div className="relative text-gray-400">
                  <div className="relative flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <UserCircle size={26} />
                  </div>
                </div>

                {/* logout */}
                <SignOutButton />
              </div>
            </div>
          </div>
        </nav>
      </div>
      <div className="mt-16 pt-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </>
  );
};

export default Template;
