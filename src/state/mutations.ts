import { Types } from '@/state/types';

export const Mutations = {
  [Types.Mutation.Comment.Set.Paginated](
    state: any,
    { comments }: { comments: any[] }
  ) {
    state.comments = [...state.comments, ...comments];
  },
  [Types.Mutation.Post.Set.Paginated](state: any, { posts }: { posts: any[] }) {
    state.posts = [...state.posts, ...posts];
  }
};
