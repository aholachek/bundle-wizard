import React from 'react'

const Tooltip = ({ hovered }) => {
  let name
  if (hovered) {
    const parentName = hovered.parent ? hovered.parent.data.name : ''
    name = `${parentName && parentName !== 'topLevel' ? `${parentName}/` : ''}${
      hovered.data.name
    }`.replace('topLevel', 'all bundles')
  }
  console.log(hovered)

  return (
    <div className={`tooltip ${!hovered ? 'tooltip-hidden' : ''}`}>
      {hovered ? (
        <div>
          {hovered.data.longTask ? (
            <div style={{ marginBottom: '.15rem' }}>
              🚨 This bundle initiated a {Math.ceil(hovered.data.longTask)}ms "long task" in the browser
              when it was evaluated
            </div>
          ) : (
            ''
          )}

          <h3>{name}</h3>

          <div className="hovered-data-row">
            <div>{Math.ceil(hovered.data.realSize / 1000)}kb minified</div>
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
