<template> </template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Types } from '@/state';

@Component
export default class Subreddit extends Vue {
  @Prop(String) private id!: string;

  // get getPosts() {
  //   return this.$store.state.posts;
  // }
  //
  // public async getPaginatedPosts() {
  //   // Get post list.
  //   await this.$store.dispatch(Types.Action.Post.Get.Paginated, {
  //     first: 100,
  //     offset: this.$store.state.posts.length
  //   });
  // }
  //
  // public async created() {
  //   // Get post list.
  //   await this.getPaginatedPosts();
  // }
}
</script>

<style scoped></style>
