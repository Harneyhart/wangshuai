import React from 'react';
import type { FormProps } from 'antd';

import PostList from '@/components/demo/PostList';

const Home = async () => {
  return (
    <div className="App">
      <PostList />
    </div>
  );
};

export default Home;
