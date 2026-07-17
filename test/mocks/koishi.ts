function element(type: string, attrs?: unknown, children?: unknown) {
  return { type, attrs, children }
}

export const h = Object.assign(element, {
  text: (content: string) => element('text', { content }),
  image: (data: unknown, mime: string) => element('image', { data, mime }),
  quote: (id: string) => element('quote', { id }),
})

const schemaChain: any = new Proxy(function schema() {}, {
  get: () => (..._args: unknown[]) => schemaChain,
  apply: () => schemaChain,
})

export const Schema: any = new Proxy({}, {
  get: () => (..._args: unknown[]) => schemaChain,
})

export class Context {}
