<template>
  <v-container grid-list-md>
    <!--    <Post v-for="post in getPosts" :key="post.id" v-bind="post"></Post>-->
    <Post v-for="i of 20" :key="i"></Post>
  </v-container>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Post from '@/components/Post.vue';
import { Actions } from '@/state';

@Component({
  components: { Post }
})
export default class PostList extends Vue {
  @Prop() private posts!: Post;

  get getPosts() {
    return this.$store.state.posts;
  }

  public async mounted() {
    // Get all posts.
    await this.$store.dispatch(Actions.Post.GetAll);
  }
}
</script>

<style scoped lang="scss"></style>
