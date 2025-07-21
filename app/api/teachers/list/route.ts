import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const teachers = await db.query.teachers.findMany({
      columns: {
        id: true,
        name: true,
      },
      orderBy: (table, { asc }) => [asc(table.name)],
    });

    return NextResponse.json({
      success: true,
      data: teachers
    });
  } catch (error) {
    console.error('获取教师列表失败:', error);
    return NextResponse.json({ error: '获取教师列表失败' }, { status: 500 });
  }
} 