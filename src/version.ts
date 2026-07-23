import fs from 'node:fs'
import path from 'node:path'

const packageJsonPath = [
  path.resolve(__dirname, '../package.json'),
  path.resolve(__dirname, '../../package.json'),
].find(fs.existsSync)

if (!packageJsonPath) throw new Error('找不到插件 package.json')

const packageMetadata = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version: string }

export const CLIENT_VERSION = packageMetadata.version
