<template>
  <v-layout row wrap class="post" my-2>
    <v-flex class="votes" xs1 px-1 mx-1>
      <v-icon class="arrow up">arrow_upward</v-icon>
      <span class="score">1234</span>
      <v-icon class="arrow down">arrow_downward</v-icon>
    </v-flex>
    <v-flex class="thumbnail" xs1 px-1 mx-1>
      <a href="#">
        <v-img
          :src="`https://lorempixel.com/70/70`"
          :lazy-src="`https://dummyimage.com/70x70/f5f5f5/f96515&text=D`"
          aspect-ratio="1"
          height="70"
          width="70"
        />
      </a>
    </v-flex>
    <v-flex class="content" xs10 px-1 mx-1>
      <span class="title">
        <a href="#" class="text--primary"
          >Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent eu
          maximus sem. Aliquam erat volutpat. Aliquam maximus efficitur ligula
          eu vestibulum.</a
        >
        <span class="domain text--secondary caption ml-1 font-weight-bold"
          >(<a href="/r/AskReddit" class="text--secondary accentuated"
            >self.AskReddit</a
          >)</span
        >
      </span>
      <span class="tagline caption">
        submitted 5 hours ago by
        <a class="accentuated" href="/user/JustSomeGuy">JustSomeGuy</a> to
        <a class="accentuated" href="/r/AskReddit">r/AskReddit</a>
      </span>
      <ul class="buttons font-weight-medium">
        <li class="comment">
          <a href="#" class="text--secondary accentuated">75 comments</a>
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
  @Prop() private id!: string;
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

    .arrow {
      &:hover {
        color: var(--v-primary-base);
      }
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
