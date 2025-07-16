import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attachments, coursePlans, coursePlansToAttachments, users } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({
        success: false,
        error: '缺少课程ID参数'
      }, { status: 400 });
    }

    // 获取该课程的所有课程计划
    const coursePlansData = await db
      .select()
      .from(coursePlans)
      .where(eq(coursePlans.courseId, courseId));

    if (coursePlansData.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // 获取所有课程计划的ID
    const coursePlanIds = coursePlansData.map(cp => cp.id);
    
    // 获取课程计划关联的附件
    const coursePlanAttachments = await db
      .select({
        coursePlanId: coursePlansToAttachments.coursePlanId,
        attachmentId: coursePlansToAttachments.attachmentId,
      })
      .from(coursePlansToAttachments)
      .where(inArray(coursePlansToAttachments.coursePlanId, coursePlanIds));

    if (coursePlanAttachments.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // 获取附件详情
    const attachmentIds = coursePlanAttachments.map(cpa => cpa.attachmentId);
    
    const attachmentsData = await db
      .select({
        id: attachments.id,
        name: attachments.name,
        fileName: attachments.fileName,
        fileKey: attachments.fileKey,
        createdAt: attachments.createdAt,
        userId: attachments.userId,
      })
      .from(attachments)
      .where(inArray(attachments.id, attachmentIds));

    // 获取上传者信息
    const userIds = Array.from(new Set(attachmentsData.map(att => att.userId)));
    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(inArray(users.id, userIds));

    const usersMap = new Map(usersData.map(user => [user.id, user.name]));

    // 格式化附件数据
    const formattedAttachments = attachmentsData.map(attachment => ({
      id: attachment.id,
      name: attachment.name,
      fileName: attachment.fileName,
      fileKey: attachment.fileKey,
      createdAt: attachment.createdAt,
      uploaderName: usersMap.get(attachment.userId) || '未知用户',
      url: `/api/attachment/view?key=${attachment.fileKey}`
    }));

    return NextResponse.json({
      success: true,
      data: formattedAttachments
    });

  } catch (error) {
    console.error('获取课程附件失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取课程附件失败'
    }, { status: 500 });
  }
} 