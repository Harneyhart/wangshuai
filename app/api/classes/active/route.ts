import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const classes = await db.query.classes.findMany({
      where: (table, { eq }) => eq(table.isActive, 1),
      columns: {
        id: true,
        name: true,
      },
      orderBy: (table, { asc }) => [asc(table.name)],
    });

    return NextResponse.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('获取班级列表失败:', error);
    return NextResponse.json({ error: '获取班级列表失败' }, { status: 500 });
  }
} 