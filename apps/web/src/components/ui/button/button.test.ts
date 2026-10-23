import { describe, expect, test } from 'vitest'
import { buttonVariants } from './index'

describe('buttonVariants', () => {
  test('outline and ghost hover with muted, never accent', () => {
    for (const variant of ['outline', 'ghost'] as const) {
      const cls = buttonVariants({ variant })
      expect(cls).toContain('hover:bg-muted')
      expect(cls).not.toMatch(/hover:bg-accent/)
    }
  })

  test('default variant darkens on press without scaling', () => {
    const cls = buttonVariants()
    expect(cls).toContain('active:bg-primary/80')
    expect(cls).toContain('transition-colors')
    expect(cls).not.toMatch(/scale/)
  })

  test('default variant uses a foreground focus outline on the orange fill', () => {
    expect(buttonVariants()).toContain('focus-visible:outline-foreground')
  })

  test('keeps 44px touch targets', () => {
    expect(buttonVariants()).toContain('h-11')
    expect(buttonVariants({ size: 'icon' })).toContain('size-11')
  })
})
