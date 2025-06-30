import { redirect } from 'next/navigation';
import dayjs from 'dayjs';
import Link from 'next/link';

import {
  checkIsStudent,
  checkIsTeacher,
  getCourseHourByUserId,
} from '@/lib/course/actions';
import type { CourseHoursWithRelations } from '@/lib/course/actions';
import { validateRequest } from '@/lib/auth/validate-request';
import SignOutButton from '@/components/demo/SignOutButton';

const Page = async () => {
  const { user } = await validateRequest();
  console.log('user', user);
  if (!user) redirect('/login');
  let courseHours: CourseHoursWithRelations[] = [];
  const isStudent = await checkIsStudent(user.id);
  const isTeacher = await checkIsTeacher(user.id);
  if (isStudent) {
    courseHours = await getCourseHourByUserId(user.id);
  }
  return (
    <div className="m-10">
      <div className="mb-10">
        <p>你好：{user.email}</p>
        <p>欢迎回来！</p>
      </div>
      <div className="mb-20">
        {isStudent && (
          <div>
            <h2>课程列表</h2>
            {courseHours.length > 0 ? (
              <ul role="list" className="divide-y divide-gray-100">
                {courseHours.map((hour) => (
                  <li
                    key={hour.id}
                    className="flex items-center justify-between gap-x-6 py-5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-x-3">
                        <p className="text-sm font-semibold leading-6 text-gray-900">
                          {hour.plan.course.name}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                        <p className="whitespace-nowrap">
                          <time>
                            {dayjs(hour.startTime).format('MM-DD HH:mm')}
                          </time>
                        </p>
                        <svg
                          viewBox="0 0 2 2"
                          className="h-0.5 w-0.5 fill-current"
                        >
                          <circle cx={1} cy={1} r={1} />
                        </svg>
                        <p className="truncate">{hour.classRoom}</p>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-x-4">
                      <Link
                        target="_blank"
                        href={`/course/hour/${hour.id}`}
                        className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:text-primary"
                      >
                        查看
                      </Link>
                      <p className="flex-none"></p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">暂无课程</p>
            )}
          </div>
        )}
        {isTeacher && (
          <div>
            <Link href="/admin">进入管理后台</Link>
          </div>
        )}
      </div>
      <div>
        <SignOutButton />
      </div>
    </div>
  );
};

export default Page;
