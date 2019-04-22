import { Types } from '@/state/types';
import { DgraphAdapter } from '@/dgraph/DgraphAdapter';

export const Actions = {
  [Types.Action.Post.Add]({ commit }: { commit: any }) {
    commit(Types.Action.Post.Add);
  },
  async [Types.Action.Post.GetAll](
    { commit, state }: { commit: any; state: any },
    posts: any
  ) {
    const result = await new DgraphAdapter().query(
      `
        {
          data(func: has(domain), first: 20) @filter((not has(crosspost_parent)) and eq(over_18, false)) {
            uid
            expand(_all_) {
              uid
              expand(_all_)
            }
          }
        }
      `
    );
    commit(Types.Action.Post.GetAll, {
      posts: result.data
    });
  },
  [Types.Action.Post.Set]({ commit }: { commit: any }) {
    commit(Types.Action.Post.Set);
  }
};
