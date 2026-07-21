import type { Context } from '@koishijs/client'
import TemplateSettings from './template-settings.vue'

export default (ctx: Context) => {
  ctx.slot({
    type: 'plugin-details',
    component: TemplateSettings,
    order: 0,
  })
}
