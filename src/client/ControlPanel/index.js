import React from 'react'
import * as d3 from 'd3'

const color = d3.scaleSequential([-0.2, 1.15], d3.interpolateRdYlGn)

const Legend = () => {
  return (
    <div className="legend">
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
        <div>
          <input
            type="checkbox"
            name=""
            id="swsc"
            onChange={toggleScriptsWithoutSourcemaps}
            checked={showScriptsWithoutSourcemaps}
          />
          &nbsp;&nbsp;
          <label htmlFor="swsc">
            show all JS (including 3rd party/ without sourcemaps)
          </label>
        </div>
      )}

      <div className="sourcemap-control">
        <input
          type="checkbox"
          name=""
          id="show-all-children"
          onChange={() => {
            setShowAllChildren(!showAllChildren)
          }}
          checked={!showAllChildren}
        />
        &nbsp;&nbsp;
        <label htmlFor="show-all-children">
          simplify graph (better for performance)
        </label>
      </div>

      <div>
        <div className="sourcemap-control">
          <input
            type="checkbox"
            name=""
            id="show-coverage"
            onChange={() => {
              setShowCoverage(!showCoverage)
            }}
            checked={showCoverage}
          />
          &nbsp;&nbsp;
          <label htmlFor="show-coverage">
            show coverage {showCoverage && <Legend />}
          </label>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel
