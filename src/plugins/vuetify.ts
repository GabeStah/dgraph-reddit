import Vue from 'vue';
import Vuetify from 'vuetify';
import 'vuetify/src/stylus/app.styl';
import colors from 'vuetify/es5/util/colors';

Vue.use(Vuetify, {
  iconfont: 'md',
  options: {
    customProperties: true
  },
  theme: {
    primary: '#f96315',
    secondary: '#29b6f6',
    accent: '#ffc046',
    info: '#73e8ff',
    warning: '#c17900',
    error: '#d32f2f',
    success: '#43a047'
  }
});
