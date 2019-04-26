<template>
  <v-container grid-list-xs>
    <Post v-for="post in getPosts" :key="post.id" v-bind="post"></Post>
    <mugen-scroll :handler="getPaginatedPosts" :handleOnMount="false">
      Loading...
    </mugen-scroll>
  </v-container>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Post from '@/components/Post.vue';
import { Types } from '@/state';
// @ts-ignore
import MugenScroll from 'vue-mugen-scroll';

@Component({
  components: { MugenScroll, Post }
})
export default class PostList extends Vue {
  get getPosts() {
    return this.$store.state.posts;
  }

  public async getPaginatedPosts() {
    // Get post list.
    await this.$store.dispatch(Types.Action.Post.Get.Paginated, {
      first: 100,
      offset: this.$store.state.posts.length
    });
  }

  public async created() {
    // Get post list.
    await this.getPaginatedPosts();
  }
}
</script>

<style scoped lang="scss"></style>
