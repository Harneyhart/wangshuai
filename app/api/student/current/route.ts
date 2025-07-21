import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/auth/validate-request';
import { queryStudentByUserId } from '@/utils/query';

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest();
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const studentInfo = await queryStudentByUserId(user.id);
    
    return NextResponse.json({
      success: true,
      data: {
        id: studentInfo?.id,
        name: studentInfo?.name || user.email || '未知学生',
        email: user.email,
        userId: user.id
      }
    });
  } catch (error) {
    console.error('获取学生信息失败:', error);
    return NextResponse.json({ error: '获取学生信息失败' }, { status: 500 });
  }
} 