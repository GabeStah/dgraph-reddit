import { Types } from '@/state/types';
import { DgraphAdapter } from '@/dgraph/DgraphAdapter';

export const Actions = {
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
