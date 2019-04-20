<template>
  <div class="post" :id="id">
    <div class="votes">
      <i class="arrow up material-icons highlight">arrow_upward</i>
      <span class="score">1234</span>
      <i class="arrow down material-icons">arrow_downward</i>
    </div>
    <a class="thumbnail" href="#">
      <img src="https://loremflickr.com/70/70" alt="" />
    </a>
    <div class="content">
      <p class="title">
        <a href="#"
          >Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent eu
          maximus sem. Aliquam erat volutpat. Aliquam maximus efficitur ligula
          eu vestibulum.</a
        >
        <span class="domain">(<a href="/r/AskReddit">self.AskReddit</a>)</span>
      </p>
      <p class="tagline">
        submitted 5 hours ago by
        <a class="highlight" href="/user/JustSomeGuy">JustSomeGuy</a> to
        <a class="highlight" href="/r/AskReddit">r/AskReddit</a>
      </p>
      <ul class="buttons">
        <li class="comment">75 comments</li>
        <li class="share">share</li>
        <li class="save">save</li>
        <li class="toggle">hide</li>
        <li class="award">give award</li>
        <li class="report">report</li>
        <li class="crosspost">crosspost</li>
      </ul>
    </div>
  </div>
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
  margin: 0 0 0.5em 0;
  padding-left: 0.35em;
  display: grid;
  grid-auto-rows: minmax(100px, auto);
  grid-gap: 10px;
  grid-template-columns: 50px 70px 1fr;

  .votes {
    grid-column: 1;
    grid-row: 1;

    * {
      display: block;
    }
  }

  .thumbnail {
    grid-column: 2;
    grid-row: 1;
  }

  .content {
    grid-column: 3;
    grid-row: 1;

    .title {
      font-weight: bold;

      a {
        text-decoration: none;
        color: rgb(61, 59, 61);
      }
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
  }
}
</style>
