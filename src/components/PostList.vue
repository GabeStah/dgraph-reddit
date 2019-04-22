<template>
  <v-container grid-list-xs>
    <Post v-for="post in getPosts" :key="post.id" v-bind="post"></Post>
  </v-container>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Post from '@/components/Post.vue';
import { Types } from '@/state';

@Component({
  components: { Post }
})
export default class PostList extends Vue {
  @Prop() private posts!: Post;

  get getPosts() {
    return this.$store.state.posts;
  }

  public async created() {
    // Get all posts.
    await this.$store.dispatch({ type: Types.Action.Post.GetAll });
  }
}
</script>

<style scoped lang="scss"></style>
