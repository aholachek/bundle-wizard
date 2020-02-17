import React from 'react'

const Tooltip = ({ hovered }) => {
  return (
    <div className={`tooltip ${!hovered ? 'tooltip-hidden' : ''}`}>
      {hovered ? (
        <div>
          <h3>
            {hovered.data.id
              .split('/')
              .filter(level => level !== 'topLevel')
              .slice(-2)
              .join('/') || 'all bundles'}
          </h3>
          <div className="hovered-data-row">
            <div>{Math.ceil(hovered.data.realSize / 1000)}kb</div>
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
