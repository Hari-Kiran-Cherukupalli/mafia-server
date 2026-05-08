import React, { useState } from 'react';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [params, setParams] = useState({});

  function navigate(to, p = {}) {
    setParams(p);
    setScreen(to);
  }

  if (screen === 'lobby') return <Lobby navigate={navigate} params={params} />;
  if (screen === 'game')  return <Game  navigate={navigate} params={params} />;
  return <Home navigate={navigate} />;
}
