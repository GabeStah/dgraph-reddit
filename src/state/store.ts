import Vuex from 'vuex';
import Vue from 'vue';
import { Actions } from '@/state/actions';
import { Mutations } from '@/state/mutations';
import { State } from '@/state/state';

Vue.use(Vuex);

export const store = new Vuex.Store({
  state: State,
  mutations: Mutations,
  actions: Actions
});
