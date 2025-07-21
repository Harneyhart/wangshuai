import { redirect } from 'next/navigation';
import dayjs from 'dayjs';
import Link from 'next/link';

import { getCourseHourByUserId } from '@/lib/course/actions';
import type { CourseHoursWithRelations } from '@/lib/course/actions';
import { validateRequest } from '@/lib/auth/validate-request';
import SignOutButton from '@/components/demo/SignOutButton';

const Page = async () => {
  const { user } = await validateRequest();
  console.log('user', user);
  if (!user) redirect('/login');

  const courseHours = await getCourseHourByUserId(user.id);
  console.log('courseHours', courseHours);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">欢迎, {user.name}!</h1>
        <SignOutButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/adminstator"
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">管理员</h2>
        </Link>

        <Link
          href="/admin_teacher"
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">教师端</h2>
        </Link>

                      <Link
          href="/admin_student"
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      >
          <h2 className="text-xl font-semibold mb-2">学生端</h2>
                      </Link>
      </div>

      {courseHours.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">我的课程安排</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseHours.map((courseHour) => (
              <div
                key={courseHour.id}
                className="p-4 bg-white rounded-lg shadow-md"
              >
                <h3 className="font-semibold mb-2">
                  {courseHour.plan.course.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  班级: {courseHour.plan.class.name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  教室: {courseHour.classRoom}
                </p>
                <p className="text-sm text-gray-600">
                  时间: {dayjs(courseHour.startTime).format('MM-DD HH:mm')} -{' '}
                  {dayjs(courseHour.endTime).format('HH:mm')}
                </p>
                    </div>
                ))}
          </div>
          </div>
        )}
    </div>
  );
};

export default Page;
