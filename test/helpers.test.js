const { partitionUrls } = require('../src/helpers')

describe('partitionUrls', () => {
  const urls = [
    'https://codesandbox.io/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js',
    'https://codesandbox.io/webpack-runtime-2b51dcfb5f09c0eb53f4.js',
    'https://google-analytics.com/foo.js',
    'https://codesandbox.io/2-37f215aa028ac3f874d2.js',
    'https://codesandbox.io/foo/component---src-pages-index-js-7defe4a35e3c01e36280.js'
  ]

  it('should separate common urls from uncommon ones', () => {
    const [fetchUrls, dontFetchUrls] = partitionUrls(urls)
    expect(fetchUrls).toEqual([
      'https://codesandbox.io/webpack-runtime-2b51dcfb5f09c0eb53f4.js',
      'https://codesandbox.io/2-37f215aa028ac3f874d2.js'
    ])

    expect(dontFetchUrls).toEqual([
      'https://codesandbox.io/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js',
      'https://google-analytics.com/foo.js',
      'https://codesandbox.io/foo/component---src-pages-index-js-7defe4a35e3c01e36280.js'
    ])
  })
})
