<template>
  <div class="home">
    <div class="left"></div>
    <PostList class="middle" />
    <div class="right"></div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import PostList from '@/components/PostList.vue';

@Component({
  components: {
    PostList
  }
})
export default class Home extends Vue {}
</script>

<style lang="scss">
.home {
  display: grid;
  grid-auto-rows: minmax(100px, auto);
  grid-gap: 10px;
  grid-template-columns: 0.5fr 2fr 0.5fr;

  .left {
    grid-column: 1;
    grid-row: 1;
  }

  .middle {
    grid-column: 2;
    grid-row: 1;
  }

  .right {
    grid-column: 3;
    grid-row: 1;
  }
}
</style>
