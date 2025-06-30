import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string(),
  real: z.string().optional(),
  classId: z.string().optional(),
  email: z.string().email('邮箱格式不对'),
  password: z.string().min(8, '密码至少8位').max(255),
  type: z.enum(['student', 'teacher']).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  name: z.string(),
  password: z.string().min(8, '密码至少8位').max(255),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    name: z.string(),
    password: z.string().min(8, '密码至少8位').max(255),
    newPassword: z.string().min(8, '密码至少8位').max(255),
    newPasswordConfirm: z.string().min(8, '密码至少8位').max(255),
  })
  .refine((obj) => obj.newPassword === obj.newPasswordConfirm, {
    message: '新密码和确认密码不一致',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
