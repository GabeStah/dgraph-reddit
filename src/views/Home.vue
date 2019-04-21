<template>
  <PostList />
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

<style lang="scss"></style>
