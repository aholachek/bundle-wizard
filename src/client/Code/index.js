import React from 'react'
import styled, { keyframes } from 'styled-components'
import Highlight, { defaultProps } from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/palenight'

const fadeIn = keyframes`
  from {
    opacity: 0
  }

  to {
    opacity: 1;
  }
`

const Container = styled.div`
  top: 5.75rem;
  animation: ${fadeIn} 2s forwards;
  position: fixed;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 1;
  overflow: auto;
  height: 100vh;
  background: rgb(41, 45, 62);
  padding: 2rem;
  font-family: 'Source Code Pro';
`

export default function Code({ code }) {
  return (
    <Container>
      <Highlight {...defaultProps} code={code} language="jsx" theme={theme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={className} style={style}>
            {tokens.map((line, i) => (
              <div {...getLineProps({ line, key: i })}>
                {line.map((token, key) => (
                  <span {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </Container>
  )
}
