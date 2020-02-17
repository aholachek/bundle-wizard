import React from 'react'

const Breadcrumbs = ({ data, setGraphRoot, hovered }) => {
  const sections = data.id.split('/')

  return (
    <div className="breadcrumb-container">
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
  )
}

Breadcrumbs.propTypes = {}

export default Breadcrumbs
