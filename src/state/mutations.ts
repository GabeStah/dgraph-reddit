import { Types } from '@/state/types';

export const Mutations = {
  [Types.Mutation.Post.Set.Paginated](state: any, { posts }: { posts: any[] }) {
    state.posts = posts;
  }
};
