import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/Home.vue';
import Link from '@/components/Link.vue';
import Subreddit from '@/components/Subreddit.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/r/:subreddit/comments/:link/*',
      name: 'link',
      component: Link
    },
    {
      path: '/r/:subreddit',
      name: 'subreddit',
      component: Subreddit
    }
  ]
});
