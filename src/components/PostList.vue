<template>
  <div class="post-list">
    <Post v-for="post in computedPosts" :key="post.id" v-bind="post"></Post>
    <!--    <p>{{ getPosts }}</p>-->
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Post from '@/components/Post.vue';
import { DgraphAdapter } from '@/dgraph/DgraphAdapter';
import { Actions } from '@/state';
import { mapState } from 'vuex';

@Component({
  components: { Post }
})
export default class PostList extends Vue {
  @Prop() private posts!: Post;

  // async getPosts(): Promise<string> {
  //   return await new DgraphAdapter().query(`
  //     {
  //       data(func: has(domain), first: 10) @filter(not has(crosspost_parent)) {
  //         uid
  //         expand(_all_) {
  //           uid
  //           expand(_all_)
  //         }
  //       }
  //     }
  //   `);
  // }

  get computedPosts() {
    return this.$store.state.posts;
  }

  //   computed () {mapState({
  //   products: state => state.posts.all
  // })

  public async mounted() {
    // Get all posts.
    await this.$store.dispatch(Actions.Post.GetAll);
  }

  // return await new DgraphAdapter().query(`
  //     {
  //       data(func: has(domain), first: 10) @filter(not has(crosspost_parent)) {
  //         uid
  //         expand(_all_) {
  //           uid
  //           expand(_all_)
  //         }
  //       }
  //     }
  //   `);

  // public data() {
  //   return {
  //     posts:
  //   };
  // }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
</style>
