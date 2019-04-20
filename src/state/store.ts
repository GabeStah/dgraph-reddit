import Vuex from 'vuex';
import { Actions, Mutations } from '@/state/';
import { DgraphAdapter } from '@/dgraph/DgraphAdapter';
import Vue from 'vue';

Vue.use(Vuex);

export const store = new Vuex.Store({
  state: {
    posts: []
  },
  mutations: {
    [Mutations.Post.Add](state: any, { post }: { post: any }) {
      state.posts.push(post);
    },
    [Mutations.Post.GetAll](state: any, { posts }: { posts: any[] }) {
      state.posts = posts;
    },
    [Mutations.Post.Set](state: any, { posts }: { posts: any[] }) {
      state.posts = posts;
    }
  },
  actions: {
    [Actions.Post.Add]({ commit }) {
      commit(Actions.Post.Add);
    },
    async [Actions.Post.GetAll]({ commit, state }, posts) {
      const result = await new DgraphAdapter().query(
        `
        {
          data(func: has(domain), first: 10) @filter((not has(crosspost_parent)) and eq(over_18, false)) {
            uid
            expand(_all_) {
              uid
              expand(_all_)
            }
          }
        }
      `
      );
      commit(Actions.Post.GetAll, {
        posts: result.data
      });
    },
    [Actions.Post.Set]({ commit }) {
      commit(Actions.Post.Set);
    }
  }
});
