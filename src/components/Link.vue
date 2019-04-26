<template>
  <v-container grid-list-xs>
    <Comment
      v-for="comment in getComments"
      :key="comment.id"
      v-bind="comment"
    ></Comment>
    <mugen-scroll
      :handler="getPaginatedComments"
      :handleOnMount="false"
    ></mugen-scroll>
  </v-container>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Comment from '@/components/Comment.vue';
import { Types } from '@/state';
// @ts-ignore
import MugenScroll from 'vue-mugen-scroll';

@Component({
  components: { MugenScroll, Comment }
})
export default class Link extends Vue {
  get getComments() {
    return this.$store.state.comments;
  }

  public async created() {
    await this.getPaginatedComments();
  }

  public async getPaginatedComments() {
    await this.$store.dispatch(Types.Action.Comment.Get.Paginated, {
      link: this.$route.params.link,
      first: 50,
      offset: this.$store.state.comments.length
    });
  }
}
</script>
