import { Types } from '@/state/types';

export const Mutations = {
  [Types.Mutation.Post.Add](state: any, { post }: { post: any }) {
    state.posts.push(post);
  },
  [Types.Mutation.Post.GetAll](state: any, { posts }: { posts: any[] }) {
    state.posts = posts;
  },
  [Types.Mutation.Post.Set](state: any, { posts }: { posts: any[] }) {
    state.posts = posts;
  }
};
