import type { Metric } from './types'

export type MetricDefinition = Pick<Metric, 'key' | 'label' | 'platform'>

const definitions = {
  facebook: [
    ['page.followers', 'Page followers'], ['group.members', 'Group members'],
    ['page.posts', 'Page posts'], ['group.posts', 'Group posts'], ['page.views', 'Facebook Page views'],
    ['page.likes', 'Page post likes'], ['page.comments', 'Page post comments'],
    ['page.shares', 'Page post shares'], ['page.clicks', 'Page post clicks'],
  ],
  reddit: [
    ['community.members', 'Reddit members'], ['community.posts', 'Tracked posts'],
    ['post.upvotes', 'Post upvotes'], ['post.comments', 'Post comments'],
  ],
  x: [
    ['profile.followers', 'X followers'], ['post.count', 'X posts'], ['post.views', 'X post views'],
    ['post.likes', 'X post likes'], ['post.replies', 'Replies on posts'], ['post.reposts', 'Reposts'],
    ['reply.count', 'Replies sent'], ['reply.views', 'X reply views'],
  ],
  tumblr: [['followers', 'Tumblr followers'], ['posts', 'Posts this period'], ['notes', 'Weekly notes']],
  discord: [['members', 'Discord members'], ['invite.uses', 'Your invite uses']],
} satisfies Record<Metric['platform'], [string, string][]>

const platforms: Metric['platform'][] = ['facebook', 'reddit', 'x', 'tumblr', 'discord']

export const reportMetricDefinitions: MetricDefinition[] = platforms.flatMap(platform =>
  definitions[platform].map(([key, label]) => ({ key: platform + '.' + key, label, platform })))
