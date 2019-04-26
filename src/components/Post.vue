<template>
  <v-layout class="post" row wrap my-2>
    <v-flex class="votes" xs1 px-1 mx-1>
      <v-icon class="arrow up accentuated">arrow_upward</v-icon>
      <span class="score">{{ score }}</span>
      <v-icon class="arrow down accentuated">arrow_downward</v-icon>
    </v-flex>
    <v-flex class="thumbnail" xs1 px-1 mx-1>
      <a :href="fullUrl">
        <v-img
          :src="thumbnailUrl"
          :lazy-src="thumbnailPlaceholderUrl"
          aspect-ratio="1"
          height="70"
          width="70"
        />
      </a>
    </v-flex>
    <v-flex class="content" xs10 px-1 mx-1>
      <span class="title">
        <a :href="fullUrl" class="text--primary">{{ title }}</a>
        <span class="domain text--secondary caption ml-1 font-weight-bold"
          >(<a :href="domainUrl" class="text--secondary accentuated">{{
            domain
          }}</a
          >)</span
        >
      </span>
      <span class="tagline caption">
        submitted {{ created_utc | moment('from') }} by
        <a class="accentuated" :href="authorUrl" v-if="hasAuthor">{{
          author
        }}</a>
        <span v-else>{{ author }}</span>
        to
        <a class="accentuated" :href="subredditUrl">r/{{ subreddit }}</a>
      </span>
      <ul class="buttons font-weight-medium">
        <li class="comment">
          <!--          <router-link-->
          <!--            :to="{ name: 'link', params: { subreddit: subreddit, link: id } }"-->
          <!--          >-->
          <!--            {{ num_comments }} comments-->
          <!--          </router-link>-->
          <a :href="permalink" class="text--secondary accentuated"
            >{{ num_comments }} comments</a
          >
        </li>
        <li class="share">
          <a href="#" class="text--secondary accentuated">share</a>
        </li>
        <li class="save">
          <a href="#" class="text--secondary accentuated">save</a>
        </li>
        <li class="toggle">
          <a href="#" class="text--secondary accentuated">hide</a>
        </li>
        <li class="award">
          <a href="#" class="text--secondary accentuated">give award</a>
        </li>
        <li class="report">
          <a href="#" class="text--secondary accentuated">report</a>
        </li>
        <li class="crosspost">
          <a href="#" class="text--secondary accentuated">crosspost</a>
        </li>
      </ul>
    </v-flex>
  </v-layout>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Post extends Vue {
  @Prop(String) private id!: string;
  @Prop(String) private author!: string;
  @Prop(String) private created_utc!: Date;
  @Prop(String) private domain!: string;
  @Prop(Boolean) private is_self!: boolean;
  @Prop(Number) private num_comments!: number;
  @Prop(String) private permalink!: string;
  @Prop(Number) private score!: number;
  @Prop(String) private subreddit!: string;
  @Prop(String) private thumbnail!: string;
  @Prop({ default: 70 }) private thumbnail_height!: number;
  @Prop({ default: 70 }) private thumbnail_width!: number;
  @Prop(String) private title!: string;
  @Prop(String) private url!: string;

  get authorUrl() {
    return `/user/${this.author}`;
  }

  get domainUrl() {
    if (this.is_self) {
      return this.subredditUrl;
    } else {
      return `/domain/${this.domain}`;
    }
  }

  get fullUrl() {
    return this.is_self ? this.permalink : this.url;
  }

  get hasAuthor() {
    return this.author !== '[deleted]';
  }

  get thumbnailPlaceholderUrl() {
    if (this.thumbnail === 'self') {
      return require('../assets/images/thumbnail-self.png');
    } else {
      return require('../assets/images/thumbnail-default.png');
    }
  }

  get subredditUrl() {
    return `/r/${this.subreddit}`;
  }

  get thumbnailUrl() {
    if (this.thumbnail === 'self') {
      return require('../assets/images/thumbnail-self.png');
    } else if (this.thumbnail === 'default') {
      return require('../assets/images/thumbnail-default.png');
    } else {
      return this.thumbnail;
    }
  }
}
</script>

<style scoped lang="scss">
.post {
  .votes {
    max-width: 40px;
    text-align: center;

    * {
      display: block;
    }
  }

  .thumbnail {
    max-width: 70px;
  }

  .content {
    a {
      text-decoration: none;
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

    .title {
      display: block;
      font-weight: bold;
    }
  }
}
</style>
