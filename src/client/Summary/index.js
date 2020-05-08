import React from 'react'

const isHighPriority = node =>
  node.request &&
  (node.request.priority === 'VeryHigh' || node.request.priority === 'High')

const Table = ({ bundles, title, description, onBundleNameClick, noWarn }) => {
  return (
    <div>
      {title && <h2>{title}</h2>}
      {description && <p>{description}</p>}
      <table>
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th>Minified size</th>
            <th>Coverage</th>
          </tr>
        </thead>
        <tbody>
          {bundles
            .sort((a, b) => b.realSize - a.realSize)
            .map((node, i) => {
              const longTaskWarning = node.longTask ? (
                <span title={`${Math.ceil(node.longTask)}ms long task`}>
                  {' '}
                  🚨
                </span>
              ) : (
                ''
              )
              return (
                <tr>
                  <td>{bundles.length > 1 && i + 1}</td>
                  <td>
                    {onBundleNameClick && node.children ? (
                      <a
                        href="#"
                        onClick={onBundleNameClick(node.name)}
                        title="Click to see treemap of this bundle and its children"
                      >
                        {node.name}
                        {longTaskWarning}
                      </a>
                    ) : (
                      <span title="Sourcemaps were not downloaded for this bundle">
                        {node.name}
                        {longTaskWarning}
                      </span>
                    )}
                  </td>
                  <td>
                    {Math.ceil(node.realSize / 1000)} kb{' '}
                    {!noWarn && Math.ceil(node.realSize / 1000) > 100
                      ? '⚠️'
                      : ''}
                  </td>
                  <td>
                    {typeof node.averageCoverage === 'number'
                      ? `${Math.floor(node.averageCoverage * 100)}%`
                      : 'n/a'}
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}

const Summary = ({ data, setGraphRoot }) => {
  const totalSize = Math.ceil(
    data.children.map(c => c.realSize).reduce((acc, curr) => acc + curr, 0)
  )

  const hasCoverage = data.children.filter(
    c => typeof c.averageCoverage === 'number'
  )
  const averageCoverage =
    hasCoverage
      .map(c => c.averageCoverage)
      .reduce((acc, curr) => acc + curr, 0) / hasCoverage.length

  debugger

  const highPriorityBundles = data.children
    .sort((a, b) => b.realSize - a.realSize)
    .filter(node => isHighPriority(node))

  const lowPriorityBundles = data.children
    .sort((a, b) => b.realSize - a.realSize)
    .filter(node => !isHighPriority(node))

  const hasLargeBundles = data.children.find(c => c.realSize > 100)
  const hasLongTasks = data.children.find(d => d.longTask)

  const onBundleNameClick = name => e => {
    e.preventDefault()
    e.stopPropagation()
    setGraphRoot(`topLevel/${name}`)
  }

  return (
    <div className="summary">
      <div>
        <Table
          noWarn
          bundles={[
            {
              name: 'All bundles',
              averageCoverage,
              realSize: totalSize
            }
          ]}
        />
        {hasLargeBundles && (
          <div>
            <p style={{ marginTop: '2rem' }}>
              <a href="https://v8.dev/blog/cost-of-javascript-2019">
                JS bundles should generally be smaller than 100kb for best
                performance.
              </a>{' '}
              Bundles larger than 100kb are marked with a ⚠️ icon.
            </p>
          </div>
        )}
        {hasLongTasks && (
          <div>
            <p>
              When JavaScript code is executed on app startup, it
              can generate long tasks that delay page interactivity. Bundles
              that kicked off long tasks > 150ms are marked here with a 🚨 icon.{' '}
              However, just because a bundle initiated a long task, doesn't mean
              the majority of the task's time was spent executing code from that
              particular bundle.{' '}
              <a href="https://web.dev/long-tasks-devtools/">
                For instructions on how to hunt down the causes of long tasks,
                check out this article.
              </a>
            </p>
          </div>
        )}
        {Boolean(highPriorityBundles.length) && (
          <Table
            onBundleNameClick={onBundleNameClick}
            bundles={highPriorityBundles}
            title="High Priority Bundles"
            description={
              <>
                These bundles were{' '}
                <a href="https://developers.google.com/web/fundamentals/performance/resource-prioritization">
                  prioritized by the browser
                </a>{' '}
                for immediate load. (They were marked "highest" or "high"
                priority by the browser). They may have more of an effect on a
                user's perception of page load speed than lower-priority
                bundles.
              </>
            }
          />
        )}
        {Boolean(lowPriorityBundles.length) && (
          <Table
            onBundleNameClick={onBundleNameClick}
            bundles={lowPriorityBundles}
            title="Lower Priority Bundles"
            description={
              <>
                These bundles were considered less important for building the
                page, which might mean they had less of an effect on the user's
                perceived initial load time. Consider{' '}
                <a href="https://medium.com/webpack/link-rel-prefetch-preload-in-webpack-51a52358f84c">
                  using the "preload" or "prefetch" directives
                </a>{' '}
                if any of these scripts should have been loaded immediately.
              </>
            }
          />
        )}
      </div>
      <h2>Analyzed page:</h2>
      <img
        className="screenshot"
        src="./screenshot.png"
        alt="screenshot of website"
      />
    </div>
  )
}

export default Summary
