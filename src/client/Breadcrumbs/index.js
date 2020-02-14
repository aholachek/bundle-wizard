import React from 'react'
import PropTypes from 'prop-types'

const Breadcrumbs = ({ data, setGraphRoot }) => {
  const sections = data.id.split('/')

  if (sections.length < 2) return null
  return (
    <div className="breadcrumb-container">
      <ul>
        {sections.map((section, i, arr) => {
          const text = section === 'topLevel' ? 'all bundles' : section
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
  )
}

Breadcrumbs.propTypes = {}

export default Breadcrumbs
