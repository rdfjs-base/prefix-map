import { rejects, strictEqual } from 'assert'
import rdf from '@rdfjs/data-model'
import { describe, it } from 'mocha'
import { Readable } from 'readable-stream'
import PrefixMap from '../PrefixMap.js'
import example from './support/exampleData.js'

describe('PrefixMap', function () {
  it('should be a constructor', () => {
    strictEqual(typeof PrefixMap, 'function')
  })

  it('the constructor should add all given prefixes', () => {
    const prefixes = new PrefixMap([
      ['ex1', example.prefix1],
      ['ex2', example.prefix2]
    ], { factory: rdf })

    strictEqual(prefixes.get('ex1').equals(example.prefix1), true)
    strictEqual(prefixes.get('ex2').equals(example.prefix2), true)
  })

  describe('.resolve', () => {
    it('should be a method', () => {
      const prefixes = new PrefixMap([], { factory: rdf })

      strictEqual(typeof prefixes.resolve, 'function')
    })

    it('should expand a CURIE NamedNode', () => {
      const prefixes = new PrefixMap([['ex', example.prefix]], { factory: rdf })

      const expanded = prefixes.resolve(rdf.namedNode('ex:test'))

      strictEqual(expanded.value, 'http://example.org/test')
    })

    it('should support empty string prefix', () => {
      const prefixes = new PrefixMap([['', example.prefix]], { factory: rdf })

      const expanded = prefixes.resolve(rdf.namedNode(':test'))

      strictEqual(expanded.value, 'http://example.org/test')
    })

    it('should return null if it\'s already an URL', () => {
      const prefixes = new PrefixMap([['ex', example.prefix]], { factory: rdf })

      const expanded = prefixes.resolve(rdf.namedNode('http://example.org/test'))

      strictEqual(expanded, null)
    })

    it('should return null if no prefix separator was found', () => {
      const prefixes = new PrefixMap([['ex', example.prefix]], { factory: rdf })

      const expanded = prefixes.resolve(rdf.namedNode('ex'))

      strictEqual(expanded, null)
    })

    it('should return null if the prefix can\'t be found', () => {
      const prefixes = new PrefixMap([['ex', example.prefix]], { factory: rdf })

      const expanded = prefixes.resolve(rdf.namedNode('ex1:test'))

      strictEqual(expanded, null)
    })
  })

  describe('.shrink', () => {
    it('should be a method', () => {
      const prefixes = new PrefixMap([], { factory: rdf })

      strictEqual(typeof prefixes.resolve, 'function')
    })

    it('should compact a NamedNode', () => {
      const prefixes = new PrefixMap([['ex', example.prefix]], { factory: rdf })

      const shrinked = prefixes.shrink(rdf.namedNode('http://example.org/test'))

      strictEqual(shrinked.termType, 'NamedNode')
      strictEqual(shrinked.value, 'ex:test')
    })

    it('should support empty string prefix', () => {
      const prefixes = new PrefixMap([['', example.prefix]], { factory: rdf })

      const shrinked = prefixes.shrink(rdf.namedNode('http://example.org/test'))

      strictEqual(shrinked.termType, 'NamedNode')
      strictEqual(shrinked.value, ':test')
    })

    it('should use the longest matching namespace', () => {
      const prefixes = new PrefixMap([
        ['ex', example.prefix],
        ['example1', example.prefix1]
      ], { factory: rdf })

      const shrinked = prefixes.shrink(rdf.namedNode('http://example.org/1/123'))

      strictEqual(shrinked.termType, 'NamedNode')
      strictEqual(shrinked.value, 'example1:123')
    })

    it('should return null if falsy is given', () => {
      const prefixes = new PrefixMap([['ex', rdf.namedNode('http://example.org/')]], { factory: rdf })

      const shrinked = prefixes.shrink(null)

      strictEqual(shrinked, null)
    })

    it('should return null if no matching prefix was found', () => {
      const prefixes = new PrefixMap([['ex', example.prefix1]], { factory: rdf })

      const shrinked = prefixes.shrink(rdf.namedNode('http://example.com/test'))

      strictEqual(shrinked, null)
    })
  })

  describe('.import', () => {
    it('should import prefixes from a stream', async () => {
      const prefixes = new PrefixMap([], { factory: rdf })
      const stream = new Readable({
        read: () => {
          stream.emit('prefix', 'ex1', example.prefix1)
          stream.emit('prefix', 'ex2', example.prefix2)
          stream.push(null)
        }
      })
      stream.resume()

      await prefixes.import(stream)

      strictEqual(prefixes.get('ex1').equals(example.prefix1), true)
      strictEqual(prefixes.get('ex2').equals(example.prefix2), true)
    })

    it('should reject on stream error', async () => {
      const prefixes = new PrefixMap([], { factory: rdf })
      const stream = new Readable({
        read: () => {
          stream.destroy(new Error('test'))
        }
      })
      stream.resume()

      await rejects(async () => {
        await prefixes.import(stream)
      })
    })
  })

  describe('.export', () => {
    it('should export prefixes to a stream', async () => {
      const prefixes = new PrefixMap([
        ['ex1', example.prefix1],
        ['ex2', example.prefix2]
      ], { factory: rdf })
      const stream = Readable.from([])
      const result = []

      stream.on('prefix', (...args) => {
        result.push(args)
      })

      await prefixes.export(stream)

      strictEqual(result.length, 2)
      strictEqual(result[0][0], 'ex1')
      strictEqual(result[0][1].equals(example.prefix1), true)
      strictEqual(result[1][0], 'ex2')
      strictEqual(result[1][1].equals(example.prefix2), true)
    })
  })
})
