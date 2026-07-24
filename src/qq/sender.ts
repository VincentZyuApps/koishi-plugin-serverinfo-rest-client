import { h, type Context, type Session } from 'koishi'
import type { Config } from '../config'
import type { OnlineStatusResult } from '../types'
import type { QQKeyboard } from './types'
import { formatErrorForLog, logInfo } from '../logger'
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
      if (config.verboseConsoleLog) {
        logInfo(ctx, config, '准备发送 QQ Markdown 图片消息', [
          `图片 URL: ${imageUrl}`,
          `Markdown 图片尺寸: ${dimensions.width}x${dimensions.height}`,
          `键盘: ${options.keyboard?.rows?.length ? '已附带' : '未附带'}`,
        ].join('\n'))
      }
      await sendQQMarkdown(ctx, config, session, markdown, options.text, options.keyboard ?? null)
      return
    } catch (error) {
      logInfo(ctx, config, '[WARN] QQ Markdown 渲染回复失败，回退普通消息', formatErrorForLog(error))
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
) {
  const text = formatPlainPlayerList(result, config)
  if (session.platform === 'qq' && config.qqMarkdownEnabled && image) {
    try {
      const imageUrl = await storeQQImage(ctx, config, image)
      const dimensions = fitQQMarkdownImage(getPngDimensions(image))
      const markdown = formatQQOnlineMarkdown(result, config, imageUrl, dimensions)
      const keyboard = buildQQKeyboard(config)
      if (config.verboseConsoleLog) {
        logInfo(ctx, config, '准备发送 QQ Markdown 在线状态', [
          `图片 URL: ${imageUrl}`,
          `Markdown 图片尺寸: ${dimensions.width}x${dimensions.height}`,
          `键盘: ${keyboard?.rows?.length ? '已附带' : '未附带'}`,
        ].join('\n'))
      }
      await sendQQMarkdown(ctx, config, session, markdown, text, keyboard)
      return
    } catch (error) {
      logInfo(ctx, config, '[WARN] QQ Markdown 发送失败，回退普通消息', formatErrorForLog(error))
    }
  }

  const children: h[] = []
  if (config.quoteCommandReplies && session.messageId) children.push(h.quote(session.messageId))
  if (image) children.push(h.image(image, 'image/png'))
  children.push(h.text(text))
  return h('', children)
}
