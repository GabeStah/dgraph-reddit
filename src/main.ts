import dotenv from 'dotenv';
dotenv.config();
import Vue from 'vue';
import './plugins/vuetify';
import App from './App.vue';
import router from './router';
import { store } from '@/state/store';
// @ts-ignore
import VueMoment from 'vue-moment';

Vue.config.productionTip = false;

Vue.use(VueMoment);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');
