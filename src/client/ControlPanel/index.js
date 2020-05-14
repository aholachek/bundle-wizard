import React from 'react'
import * as d3 from 'd3'

const color = d3.scaleSequential([-0.2, 1.15], d3.interpolateRdYlGn)

const Legend = () => {
  return (
    <div className="legend">
      <div className="legend__colors">
        <div className="legend__label">0%</div>
        {[...Array(6).keys()].map(i => (
          <div style={{ backgroundColor: color(i / 5) }} key={i}></div>
        ))}
        <div className="legend__label">100%</div>
      </div>
    </div>
  )
}

const ControlPanel = ({
  toggleScriptsWithoutSourcemaps,
  showScriptsWithoutSourcemaps,
  setShowCoverage,
  showCoverage,
  isTopLevel,
  showAllChildren,
  setShowAllChildren
}) => {
  return (
    <div
      className={`control-panel `}
      onClick={e => {
        if (window.scrollY === 0) {
          window.scrollBy({
            top: 100,
            left: 0,
            behavior: 'smooth'
          })
        }
      }}
    >
      {isTopLevel && (
        <div className="sourcemap-control">
          <label>
            <input
              type="checkbox"
              name=""
              onChange={toggleScriptsWithoutSourcemaps}
              checked={showScriptsWithoutSourcemaps}
            />
            show JSON & 3rd party scripts
          </label>
        </div>
      )}

      <div className="sourcemap-control">
        <label>
          <input
            type="checkbox"
            name=""
            onChange={() => {
              setShowAllChildren(!showAllChildren)
            }}
            checked={!showAllChildren}
          />
          simplify graph
        </label>
      </div>

      <div>
        <div className="sourcemap-control">
          <label>
            <input
              type="checkbox"
              name=""
              onChange={() => {
                setShowCoverage(!showCoverage)
              }}
              checked={showCoverage}
            />
            show coverage {showCoverage && <Legend />}
          </label>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
