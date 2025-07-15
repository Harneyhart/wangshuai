'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import { Signup } from '@/app/(auth)/signup/signup';
import { getCourseHourById } from '@/lib/course/actions';
import type { CourseHoursWithRelations } from '@/lib/course/actions';

const Invite = () => {
  const [detail, setDetail] = useState<CourseHoursWithRelations>();
  const { cid } = useParams();

  const getData = async () => {
    if (cid) {
      const data = await getCourseHourById(cid as string);
      if (data) {
        setDetail(data);
        document.title = `邀请注册 - ${data.plan.course.name} - BioAZ`;
      }
    }
  };
  useEffect(() => {
    getData();
  }, [cid]);
  if (!detail) {
    return null;
  }
  return (
    <div>
      <h1 className="mb-0 font-bold text-lg">
        邀请注册 - 课程：{detail.plan.course.name}
      </h1>
      <Signup classId={detail.plan.classId} />
    </div>
  );
};

export default Invite;
