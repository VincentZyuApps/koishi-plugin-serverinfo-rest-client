<template>
  <section v-if="isCurrentPlugin" class="template-panel">
    <div class="template-heading">
      <div>
        <h3>Typst 运行时模板</h3>
        <p>出图读取下方目录中的模板，手动修改会保留，插件启动时只补充缺失文件。</p>
      </div>
      <k-button title="重新读取模板状态" :disabled="loading || restoring" @click="refreshStatus">
        刷新
      </k-button>
    </div>

    <k-comment v-if="errorMessage" type="error">
      {{ errorMessage }}
    </k-comment>

    <div v-if="status" class="template-status">
      <div class="status-row status-path">
        <span>运行目录</span>
        <code>{{ status.runtimePath }}</code>
      </div>
      <div class="status-grid">
        <div>
          <span>默认模板</span>
          <strong>{{ status.officialCount }}</strong>
        </div>
        <div>
          <span>当前文件</span>
          <strong>{{ status.readyCount }}</strong>
        </div>
        <div>
          <span>用户修改</span>
          <strong>{{ status.modifiedCount }}</strong>
        </div>
        <div>
          <span>缺失文件</span>
          <strong>{{ status.missingCount }}</strong>
        </div>
      </div>
      <div class="template-files">
        <span v-for="file in status.files" :key="file">{{ file }}</span>
      </div>
    </div>

    <div class="template-actions">
      <k-button type="danger" :disabled="loading || restoring" @click="restoreTemplates">
        {{ restoring ? '正在恢复...' : '恢复默认模板' }}
      </k-button>
      <span>恢复前会备份整个 templates 目录，备份名称包含秒级时间戳。</span>
    </div>

    <k-comment v-if="resultMessage" type="success">
      {{ resultMessage }}
    </k-comment>
  </section>
</template>

<script lang="ts" setup>
import { send } from '@koishijs/client'
import { computed, inject, onMounted, ref, watch } from 'vue'

interface TemplateStatus {
  runtimePath: string
  officialCount: number
  readyCount: number
  modifiedCount: number
  missingCount: number
  files: string[]
}

interface TemplateRestoreResult extends Omit<TemplateStatus, 'files'> {
  backupPath: string | null
}

const local: any = inject('manager.settings.local')
const status = ref<TemplateStatus>()
const loading = ref(false)
const restoring = ref(false)
const errorMessage = ref('')
const resultMessage = ref('')

const isCurrentPlugin = computed(() => {
  const currentName = String(local?.value?.name || '')
  return currentName === 'koishi-plugin-ll-serverinfo-rest-client'
    || currentName === 'll-serverinfo-rest-client'
    || currentName.includes('ll-serverinfo-rest-client')
})

async function refreshStatus() {
  if (!isCurrentPlugin.value || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    status.value = await send('ll-serverinfo-rest-client/templates/status' as any)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

async function restoreTemplates() {
  if (restoring.value) return
  const confirmed = window.confirm(
    '确认恢复全部默认 Typst 模板吗？\n\n当前运行目录会先完整备份，之后由 npm 包内模板覆盖。',
  )
  if (!confirmed) return

  restoring.value = true
  errorMessage.value = ''
  resultMessage.value = ''
  try {
    const result = await send('ll-serverinfo-rest-client/templates/restore' as any) as TemplateRestoreResult
    resultMessage.value = result.backupPath
      ? `恢复完成，原模板已备份到：${result.backupPath}`
      : '恢复完成；原运行目录不存在，因此没有生成备份。'
    await refreshStatus()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    restoring.value = false
  }
}

watch(isCurrentPlugin, (active) => {
  if (active) refreshStatus()
}, { immediate: true })

onMounted(() => {
  if (isCurrentPlugin.value && !status.value) refreshStatus()
})
</script>

<style lang="scss" scoped>
.template-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 0;
}

.template-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h3 {
    margin: 0 0 4px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--k-color-muted);
    line-height: 1.5;
  }
}

.template-status {
  border: 1px solid var(--k-color-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--k-card-bg);
}

.status-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px;
  border-bottom: 1px solid var(--k-color-border);

  span {
    color: var(--k-color-muted);
  }

  code {
    overflow-wrap: anywhere;
  }
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border-right: 1px solid var(--k-color-border);
  }

  div:last-child {
    border-right: 0;
  }

  span {
    color: var(--k-color-muted);
    font-size: 12px;
  }

  strong {
    font-size: 20px;
  }
}

.template-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px;
  border-top: 1px solid var(--k-color-border);

  span {
    padding: 3px 7px;
    border: 1px solid var(--k-color-border);
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
  }
}

.template-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  span {
    color: var(--k-color-muted);
    font-size: 13px;
  }
}

@media (max-width: 720px) {
  .template-heading {
    align-items: flex-start;
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-grid div:nth-child(2) {
    border-right: 0;
  }

  .status-grid div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--k-color-border);
  }
}
</style>
