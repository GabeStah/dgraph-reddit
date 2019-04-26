<template>
  <v-layout class="comment" row wrap my-2>
    <v-flex class="votes" xs1 px-1 mx-1>
      <v-icon class="arrow up accentuated">arrow_upward</v-icon>
      <v-icon class="arrow down accentuated">arrow_downward</v-icon>
    </v-flex>
    <v-flex class="content" xs11 px-1 mx-1>
      <span class="tagline caption">
        <a class="accentuated" :href="authorUrl" v-if="hasAuthor">{{
          author
        }}</a>
        <span v-else>{{ author }}</span>
        <span class="score">{{ score }} points</span>
        {{ created_utc | moment('from') }}
      </span>
      <span class="body" v-html="body"></span>
      <ul class="buttons font-weight-medium">
        <li class="permalink">
          <a :href="permalink" class="text--secondary accentuated">permalink</a>
        </li>
        <li class="source">
          <a href="#" class="text--secondary accentuated">share</a>
        </li>
        <li class="embed">
          <a href="#" class="text--secondary accentuated">save</a>
        </li>
        <li class="save">
          <a href="#" class="text--secondary accentuated">hide</a>
        </li>
        <li class="report">
          <a href="#" class="text--secondary accentuated">report</a>
        </li>
        <li class="award">
          <a href="#" class="text--secondary accentuated">give award</a>
        </li>
        <li class="reply">
          <a href="#" class="text--secondary accentuated">reply</a>
        </li>
        <li class="hide-children">
          <a href="#" class="text--secondary accentuated"
            >hide child comments</a
          >
        </li>
      </ul>
    </v-flex>
  </v-layout>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Comment extends Vue {
  @Prop(String) private id!: string;
  @Prop(String) private author!: string;
  @Prop(String) private author_flair_text!: string;
  @Prop(String) private body!: string;
  @Prop(Boolean) private can_gild!: boolean;
  @Prop(Number) private controversiality!: number;
  @Prop(String) private created_utc!: Date;
  @Prop(String) private distinguished!: string;
  @Prop(Boolean) private edited!: boolean;
  @Prop(Number) private gilded!: number;
  @Prop(Boolean) private is_submitter!: boolean;
  @Prop(String) private link_id!: string;
  @Prop(String) private parent_id!: string;
  @Prop(String) private permalink!: string;
  @Prop(String) private retrieved_on!: Date;
  @Prop(Number) private score!: number;
  @Prop(Boolean) private stickied!: boolean;
  @Prop(String) private subreddit!: string;
  @Prop(String) private subreddit_id!: string;
  @Prop(String) private subreddit_type!: string;

  get authorUrl() {
    return `/user/${this.author}`;
  }

  get hasAuthor() {
    return this.author !== '[deleted]';
  }

  get subredditUrl() {
    return `/r/${this.subreddit}`;
  }
}
</script>

<style scoped lang="scss">
.votes {
  max-width: 20px;
  text-align: center;

  * {
    display: block;
  }
}

.content {
  a {
    text-decoration: none;
  }

  .body {
    display: block;
  }

  .buttons {
    display: block;
    list-style-type: none;
    padding: 1px 0;

    li {
      display: inline-block;
      line-height: 1.5em;
      padding-right: 0.33em;
    }
  }

  .score {
    padding: 0 0.25em;
  }
}
</style>
