'use server';

import { upsertDemoNotes, queryDemoNotes } from '@/utils/query';

export type FieldType = {
  title?: string;
  text?: string;
  user_id: string;
};

export async function getAllPosts(user_id: string) {
  const data = await queryDemoNotes(user_id);
  return data;
}

export async function createPost(formData: FieldType) {
  console.log('rawFormData', formData);
  const data = await upsertDemoNotes(formData);
  return data;
}
