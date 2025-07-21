import { redirect } from 'next/navigation';

import { createPost } from '@/lib/notes/actions';
import { validateRequest } from '@/lib/auth/validate-request';
import PostList from '@/components/demo/PostList';

const Notes = async () => {
  const { user } = await validateRequest();
  if (!user) redirect('/login');
  return (
    <div className="px-10 max-w-3xl mx-auto">
      <PostList userId={user.id} />
    </div>
  );
};

export default Notes;
