export const DgraphSchema = {
  Comment: `
    author: string @index(hash) @count .
    author_flair_css_class: string @index(hash) .
    author_flair_text: string @index(hash) .
    body: string @index(hash, fulltext) .
    can_gild: bool @index(bool) @count .
    controversiality: int @index(int) @count .
    created_utc: dateTime @index(day) .
    distinguished: string @index(hash) @count .
    edited: bool @index(bool) @count .
    gilded: int @index(int) @count .
    id: string @index(hash) @count .
    is_submitter: bool @index(bool) @count .
    link_id: string @index(hash) @count .
    parent_id: string @index(hash) @count .
    permalink: string @index(hash) .
    retrieved_on: dateTime @index(day) .
    score: int @index(int) @count .
    stickied: bool @index(bool) @count .
    subreddit: string @index(hash) .
    subreddit_id: string @index(hash) .
    subreddit_type: string @index(hash) .
  `,
  Post: `
    archived: bool @index(bool) @count .
    author: string @index(hash) @count .
    brand_safe: bool .
    contest_mode: bool @index(bool) @count .
    created_utc: dateTime @index(day) .
    domain: string @index(hash) .
    edited: bool @index(bool) @count .
    gilded: int @index(int) @count .
    hidden: bool @index(bool) @count .
    hide_score: bool @index(bool) @count .
    id: string @index(hash) .
    is_crosspostable: bool @index(bool) @count .
    is_reddit_media_domain: bool @index(bool) .
    is_self: bool @index(bool) @count .
    is_video: bool @index(bool) @count .
    locked: bool @index(bool) @count .
    no_follow: bool @index(bool) @count .
    num_comments: int @index(int) .
    num_crossposts: int @index(int) .
    over_18: bool @index(bool) @count .
    parent_whitelist_status: string .
    permalink: string @index(hash) .
    pinned: bool @index(bool) .
    post_hint: string @index(hash) .
    preview: uid @count @reverse .
    retrieved_on: dateTime @index(day) .
    score: int @index(int) .
    selftext: string @index(hash, fulltext) .
    send_replies: bool @index(bool) @count .
    spoiler: bool @index(bool) @count .
    stickied: bool @index(bool) @count .
    subreddit: string @index(hash) .
    subreddit_id: string @index(hash) .
    subreddit_type: string @index(hash) .
    thumbnail: string @index(hash) .
    title: string @index(hash, fulltext) .
    url: string @index(hash) .
    whitelist_status: string @index(hash) .
  `
};
