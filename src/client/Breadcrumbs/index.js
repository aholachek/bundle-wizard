import React from 'react'
import * as d3 from 'd3'

const color = d3.scaleSequential([-0.2, 1.15], d3.interpolateRdYlGn)

const Legend = () => {
  return (
    <div className="legend">
      <div>code coverage</div>
      <div className="legend__colors">
        <div className="legend__label">0%</div>
        {[...Array(11).keys()].map(i => (
          <div style={{ backgroundColor: color(i / 10) }}></div>
        ))}
        <div className="legend__label">100%</div>
      </div>
    </div>
  )
}

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
      <Legend />
    </div>
  )
}

Breadcrumbs.propTypes = {}

export default Breadcrumbs
