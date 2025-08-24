import React, { useState } from 'react'
import mylgLogo from './assets/svg/logo.svg'
import reactLogo from './assets/react.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <img src={mylgLogo} className="logo" alt="MyLG logo" />
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Ⓜ</h1>

    </>
  )
}

export default App
