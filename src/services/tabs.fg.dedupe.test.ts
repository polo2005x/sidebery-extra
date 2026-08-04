import { describe, expect, test } from 'vitest'
import * as Tabs from 'src/services/tabs.fg'
import { DEFAULT_SETTINGS } from 'src/defaults'

// Apply a newline-separated rules string to a value, the way dedupeTabs normalizes keys.
function normalize(value: string, rulesConf: string): string {
  let out = value
  for (const line of rulesConf.split('\n')) {
    try {
      const rule = Tabs.parseDedupeUrlRule(line)
      out = out.replace(rule.re, rule.repl)
    } catch {
      // skip blank/invalid
    }
  }
  return out
}

describe('Tabs.parseDedupeUrlRule()', () => {
  test('strip-only rule (no replacement)', () => {
    const rule = Tabs.parseDedupeUrlRule(String.raw`-version-\d+`)
    expect(rule.re).toBeInstanceOf(RegExp)
    expect(rule.re.flags).toContain('g')
    expect(rule.repl).toBe('')
    expect('https://f.com/post-version-3'.replace(rule.re, rule.repl)).toBe('https://f.com/post')
    expect('https://f.com/post-version-4'.replace(rule.re, rule.repl)).toBe('https://f.com/post')
  })

  test('pattern => replacement rule', () => {
    const rule = Tabs.parseDedupeUrlRule(String.raw`/page/\d+ => /page/N`)
    expect(rule.repl).toBe('/page/N')
    expect('https://f.com/page/12'.replace(rule.re, rule.repl)).toBe('https://f.com/page/N')
  })

  test('replacement may be empty after the arrow', () => {
    const rule = Tabs.parseDedupeUrlRule(String.raw`\?.*$ => `)
    expect(rule.repl).toBe('')
    expect('https://f.com/x?a=1&b=2'.replace(rule.re, rule.repl)).toBe('https://f.com/x')
  })

  test('blank lines and comments throw "no rule"', () => {
    expect(() => Tabs.parseDedupeUrlRule('')).toThrow('no rule')
    expect(() => Tabs.parseDedupeUrlRule('   ')).toThrow('no rule')
    expect(() => Tabs.parseDedupeUrlRule('# just a comment')).toThrow('no rule')
    expect(() => Tabs.parseDedupeUrlRule('   =>   ')).toThrow('no rule')
  })

  test('invalid regex throws (so the UI can flag it)', () => {
    expect(() => Tabs.parseDedupeUrlRule('(')).toThrow()
  })
})

describe('default title rules (dedupTitleRules)', () => {
  const conf = DEFAULT_SETTINGS.dedupTitleRules

  test('strip content inside [] and ()', () => {
    const a = normalize('[Release] My Thread (v3)', conf)
    const b = normalize('[Release] My Thread (v4)', conf)
    expect(a).toBe(b)
    expect(a).toBe(' My Thread ')
  })

  test('titles that differ outside brackets stay distinct', () => {
    const a = normalize('[Release] Alpha (v1)', conf)
    const b = normalize('[Release] Beta (v1)', conf)
    expect(a).not.toBe(b)
  })
})
