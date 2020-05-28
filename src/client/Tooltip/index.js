import React from 'react'

const Tooltip = ({ hovered }) => {
  let name
  if (hovered) {
    const parentName = hovered.parent ? hovered.parent.data.name : ''
    name = `${parentName && parentName !== 'topLevel' ? `${parentName}/` : ''}${
      hovered.data.name
    }`.replace('topLevel', 'all bundles')
  }

  return (
    <div className={`tooltip ${!hovered ? 'tooltip-hidden' : ''}`}>
      {hovered ? (
        <div>
          {hovered.data.longTask ? (
            <div style={{ marginBottom: '.15rem' }}>
              🚨 This bundle originated a {Math.ceil(hovered.data.longTask)}ms &quot;long task&quot; in the browser
            </div>
          ) : (
            ''
          )}

          <h3>{name}</h3>

          <div className="hovered-data-row">
            <div>{Math.ceil(hovered.data.realSize / 1000).toLocaleString()}kb minified</div>
            <div>
              {typeof hovered.data.averageCoverage !== 'number'
                ? 'no coverage data'
                : `${Math.floor(hovered.data.averageCoverage * 100)}% coverage`}
            </div>

            {hovered.data.originalChildCount ? (
              <div>
                {hovered.data.originalChildCount} direct{' '}
                {hovered.data.originalChildCount === 1 ? 'child' : 'children'}{' '}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

Tooltip.defaultProps = {
  hovered: { data: undefined }
}

export default Tooltip
