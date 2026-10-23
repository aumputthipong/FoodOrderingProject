import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const files = [
  'checkbox/Checkbox.vue',
  'radio-group/RadioGroupItem.vue',
  'tabs/TabsTrigger.vue',
  'switch/Switch.vue',
  'input/Input.vue',
  'textarea/Textarea.vue',
]

describe('control focus uses the global outline', () => {
  test.each(files)('%s has no outline-none or focus ring overrides', (file) => {
    const src = readFileSync(resolve(__dirname, file), 'utf8')
    expect(src).not.toMatch(/outline-none|focus-visible:ring|focus-visible:outline/)
  })

  test('switch thumb sits flush at both ends', () => {
    const src = readFileSync(resolve(__dirname, 'switch/Switch.vue'), 'utf8')
    expect(src).toContain('data-[state=checked]:translate-x-[calc(100%+2px)]')
  })
})
