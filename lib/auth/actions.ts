'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { generateId, Scrypt } from 'lucia';
import { eq } from 'drizzle-orm';
import { lucia } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  loginSchema,
  signupSchema,
  changePasswordSchema,
  type LoginInput,
  type SignupInput,
  type ChangePasswordInput,
} from '@/lib/validators/auth';
import { users, students, studentsToClasses } from '@/lib/db/schema';
import { validateRequest } from '@/lib/auth/validate-request';

export interface ActionResponse<T> {
  fieldError?: Partial<Record<keyof T, string | undefined>>;
  formError?: string;
}

export async function login(
  _: any,
  formData: FormData,
): Promise<ActionResponse<LoginInput>> {
  const obj = Object.fromEntries(formData.entries());

  const parsed = loginSchema.safeParse(obj);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    return {
      fieldError: {
        name: err.fieldErrors.name?.[0],
        password: err.fieldErrors.password?.[0],
      },
    };
  }

  const { name, password } = parsed.data;

  const existingUser = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.name, name),
  });

  if (!existingUser) {
    return {
      formError: '用户名或密码错误',
    };
  }

  if (!existingUser || !existingUser?.hashedPassword) {
    return {
      formError: '用户名或密码错误',
    };
  }

  const validPassword = await new Scrypt().verify(
    existingUser.hashedPassword,
    password,
  );
  if (!validPassword) {
    return {
      formError: '用户名或密码错误',
    };
  }

  const session = await lucia.createSession(existingUser.id, {
    account: {
      id: existingUser.id,
      isAdmin: existingUser.isAdmin,
      email: existingUser.email,
    },
  });
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes,
  );
  return redirect('/');
}

export async function signup(
  _: any,
  formData: FormData,
): Promise<ActionResponse<SignupInput>> {
  const obj = Object.fromEntries(formData.entries());

  const parsed = signupSchema.safeParse(obj);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    return {
      fieldError: {
        name: err.fieldErrors.name?.[0],
        email: err.fieldErrors.email?.[0],
        password: err.fieldErrors.password?.[0],
        real: err.fieldErrors.real?.[0],
        type: err.fieldErrors.type?.[0],
        classId: err.fieldErrors.classId?.[0],
      },
    };
  }

  const { name, email, password, type, real, classId } = parsed.data;

  const existingUser = await db.query.users.findFirst({
    where: (table, { eq, or }) =>
      or(eq(table.name, name), eq(table.email, email)),
    columns: { email: true, name: true },
  });

  if (existingUser) {
    return {
      formError: '邮箱或用户名已存在',
    };
  }

  const userId = generateId(21);
  const hashedPassword = await new Scrypt().hash(password);
  const newUser = await db
    .insert(users)
    .values({
      id: userId,
      name,
      email,
      hashedPassword,
    })
    .returning();

  // 如果 type 是 学生，那么创建一个学生
  if (type === 'student' && real) {
    const studentId = generateId(21);
    await db.insert(students).values({
      id: studentId,
      name: real,
      userId,
    });

    // 如果有 classId，那么加入班级
    if (classId) {
      await db.insert(studentsToClasses).values({
        studentId,
        classId,
      });
    }
  }

  const session = await lucia.createSession(userId, {
    account: {
      id: newUser[0].id,
      isAdmin: newUser[0].isAdmin,
      email: newUser[0].email,
    },
  });
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes,
  );
  return redirect('/');
}
export async function changePasswordByUser(
  _: any,
  formData: FormData,
): Promise<ActionResponse<ChangePasswordInput>> {
  const obj = Object.fromEntries(formData.entries());

  const parsed = changePasswordSchema.safeParse(obj);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    console.log('err', err);
    if (err.formErrors) {
      return {
        formError: err.formErrors?.[0],
      };
    }
    return {
      fieldError: {
        name: err.fieldErrors.name?.[0],
        password: err.fieldErrors.password?.[0],
        newPassword: err.fieldErrors.newPassword?.[0],
        newPasswordConfirm: err.fieldErrors.newPasswordConfirm?.[0],
      },
    };
  }

  const { name, password, newPassword } = parsed.data;

  const existingUser = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.name, name),
  });

  if (!existingUser || !existingUser?.hashedPassword) {
    return {
      formError: '用户名或密码错误',
    };
  }

  const validPassword = await new Scrypt().verify(
    existingUser.hashedPassword,
    password,
  );
  if (!validPassword) {
    return {
      formError: '用户名或密码错误',
    };
  }

  const userId = existingUser.id;
  const hashedPassword = await new Scrypt().hash(newPassword);
  await db
    .update(users)
    .set({ hashedPassword })
    .where(eq(users.id, userId))
    .returning();
  return redirect('/');
}

export async function changePassword(
  _: any,
  formData: FormData,
): Promise<ActionResponse<SignupInput>> {
  const obj = Object.fromEntries(formData.entries());

  const parsed = loginSchema.safeParse(obj);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    return {
      fieldError: {
        name: err.fieldErrors.name?.[0],
        password: err.fieldErrors.password?.[0],
      },
    };
  }

  const { name, password } = parsed.data;

  const existingUser = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.name, name),
  });

  if (!existingUser) {
    return {
      formError: '用户不存在',
    };
  }

  const userId = existingUser.id;
  const hashedPassword = await new Scrypt().hash(password);
  await db
    .update(users)
    .set({ hashedPassword })
    .where(eq(users.id, userId))
    .returning();
  return redirect('/');
}

export async function logout(): Promise<{ error: string } | void> {
  const { session } = await validateRequest();
  if (!session) {
    return {
      error: 'No session found',
    };
  }
  await lucia.invalidateSession(session.id);
  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes,
  );
  return redirect('/');
}

const timeFromNow = (time: Date) => {
  const now = new Date();
  const diff = time.getTime() - now.getTime();
  const minutes = Math.floor(diff / 1000 / 60);
  const seconds = Math.floor(diff / 1000) % 60;
  return `${minutes}m ${seconds}s`;
};
