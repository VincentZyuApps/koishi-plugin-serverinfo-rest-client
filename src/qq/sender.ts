import { h, type Context, type Session } from 'koishi'
import type { Config } from '../config'
import type { OnlineStatusResult } from '../types'
import type { QQKeyboard } from './types'
import { buildQQKeyboard } from './keyboard'
import { fitQQMarkdownImage, getPngDimensions } from './image'
import { sendQQMarkdown } from './markdown'
import { storeQQImage } from './server'
import { formatPlainPlayerList, formatQQOnlineMarkdown, formatQQRenderedMarkdown } from './template'

export interface RenderedReplyOptions {
  image: Buffer
  text: string
  title: string
  markdownBody?: string
  keyboard?: QQKeyboard | null
}

export async function sendRenderedReply(
  ctx: Context,
  session: Session,
  config: Config,
  options: RenderedReplyOptions,
  logger: any,
) {
  if (session.platform === 'qq' && config.qqMarkdownEnabled) {
    try {
      const imageUrl = await storeQQImage(ctx, config, options.image)
      const dimensions = fitQQMarkdownImage(getPngDimensions(options.image))
      const markdown = formatQQRenderedMarkdown(
        options.title,
        imageUrl,
        dimensions,
        options.markdownBody,
      )
      await sendQQMarkdown(session, markdown, options.text, options.keyboard ?? null)
      return
    } catch (error) {
      logger.warn(`QQ Markdown 渲染回复失败，回退普通消息: ${error}`)
    }
  }

  const children: h[] = []
  if (config.quoteCommandReplies && session.messageId) children.push(h.quote(session.messageId))
  children.push(h.image(options.image, 'image/png'))
  children.push(h.text(options.text))
  return h('', children)
}

export async function sendOnlineStatus(
  ctx: Context,
  session: Session,
  config: Config,
  result: OnlineStatusResult,
  image: Buffer | null,
  logger: any,
) {
  const text = formatPlainPlayerList(result, config)
  if (session.platform === 'qq' && config.qqMarkdownEnabled && image) {
    try {
      const imageUrl = await storeQQImage(ctx, config, image)
      const dimensions = fitQQMarkdownImage(getPngDimensions(image))
      const markdown = formatQQOnlineMarkdown(result, config, imageUrl, dimensions)
      await sendQQMarkdown(session, markdown, text, buildQQKeyboard(config))
      return
    } catch (error) {
      logger.warn(`QQ Markdown 发送失败，回退普通消息: ${error}`)
    }
  }

  const children: h[] = []
  if (config.quoteCommandReplies && session.messageId) children.push(h.quote(session.messageId))
  if (image) children.push(h.image(image, 'image/png'))
  children.push(h.text(text))
  return h('', children)
}
