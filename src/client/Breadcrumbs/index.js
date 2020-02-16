import React from 'react'

const Breadcrumbs = ({ data, setGraphRoot, hovered }) => {
  const sections = data.id.split('/')


  return (
    <div className="breadcrumb-container">
      <div>
        {sections.length >= 2 ? (
          <div>
            <ul>
              {sections.map((section, i, arr) => {
                const text = section === 'topLevel' ? ' ⬅ all bundles' : section
                return (
                  <>
                    <li>
                      <a
                        onClick={() => {
                          setGraphRoot(arr.slice(0, i + 1).join('/'))
                        }}
                        href="#"
                      >
                        {text}
                      </a>
                    </li>
                    {i !== arr.length - 1 && <>&nbsp;/&nbsp;</>}
                  </>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
      <div>
        {hovered ? (
          <div>
            <h3>
              {hovered.data.id
                .split('/')
                .filter(level => level !== 'topLevel')
                .slice(-2)
                .join('/')}
            </h3>
            <div className="hovered-data-row">
              <div>{Math.ceil(hovered.data.realSize / 1000)}kb</div>
              <div>
                {Math.floor(hovered.data.averageCoverage * 100)}% coverage
              </div>
              <div>{hovered.value /  1000}</div>

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
    </div>
  )
}

Breadcrumbs.propTypes = {}

export default Breadcrumbs
