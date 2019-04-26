import { Types } from '@/state/types';
import { DgraphAdapter } from '@/dgraph/DgraphAdapter';

export const Actions = {
  async [Types.Action.Comment.Get.Paginated](
    { commit }: { commit: any },
    {
      link,
      first = 50,
      offset = 0
    }: { link: string; first?: number; offset?: number }
  ) {
    const { data } = await new DgraphAdapter().query(
      `query comments($link: string, $first: int, $offset: int) {
        data(func: eq(link_id, $link), first: $first, offset: $offset) {
          uid
          expand(_all_) {
            uid
            expand(_all_)
          }
        }
      }`,
      { $link: `t3_${link}`, $first: first, $offset: offset }
    );

    commit(Types.Mutation.Comment.Set.Paginated, { comments: data });
  },
  async [Types.Action.Post.Get.Paginated](
    { commit }: { commit: any },
    { first = 50, offset = 0 }: { first?: number; offset?: number }
  ) {
    const { data } = await new DgraphAdapter().query(
      `query posts($first: int, $offset: int) {
          data(func: has(domain), first: $first, offset: $offset)
            @filter((not has(crosspost_parent)) and eq(over_18, false)) {
            uid
            expand(_all_) {
              uid
              expand(_all_)
            }
          }
        }`,
      { $first: first, $offset: offset }
    );

    commit(Types.Mutation.Post.Set.Paginated, { posts: data });
  }
};
