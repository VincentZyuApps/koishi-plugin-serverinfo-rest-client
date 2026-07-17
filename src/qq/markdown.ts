import { h, type Session } from 'koishi'
import type { QQKeyboard } from './types'

export async function sendQQMarkdown(
  session: Session,
  markdown: string,
  fallbackContent: string,
  keyboard: QQKeyboard | null,
) {
  const bot = session.bot as any
  if (bot.config?.autoStreamText) {
    await session.send(h('qq:rawmarkdown', {
      content: markdown,
      ...(keyboard ? { keyboard } : {}),
    }))
    return
  }

  const payload: any = {
    msg_type: 2,
    content: fallbackContent,
    markdown: { content: markdown },
  }
  if (keyboard?.rows?.length) payload.keyboard = { content: keyboard }
  if (session.messageId && Date.now() - (session.timestamp || Date.now()) < 300_000) {
    payload.msg_id = session.messageId
    payload.msg_seq = Math.floor(Math.random() * 0xffffff) + 1
  }

  if (!bot.internal) throw new Error('当前 QQ 适配器未暴露 internal 发送接口')
  if (session.isDirect && bot.internal.sendPrivateMessage) {
    await bot.internal.sendPrivateMessage(session.channelId, payload)
  } else {
    await bot.internal.sendMessage(session.channelId, payload)
  }
}
