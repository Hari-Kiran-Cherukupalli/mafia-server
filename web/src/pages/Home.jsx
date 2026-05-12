import React, { useState, useEffect } from 'react';
import socket from '../socket.js';

export default function Home({ navigate, params = {} }) {
  const [name, setName] = useState(params.playerName || '');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('menu');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onRoomCreated = ({ roomCode, playerId, room }) => {
      setLoading(false);
      navigate('lobby', { roomCode, playerId, playerName: name.trim(), isHost: true, initialRoom: room });
    };
    const onRoomJoined = ({ roomCode, playerId, room }) => {
      setLoading(false);
      navigate('lobby', { roomCode, playerId, playerName: name.trim(), isHost: false, initialRoom: room });
    };
    const onJoinError = ({ message }) => { setLoading(false); alert(message); };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('roomCreated', onRoomCreated);
    socket.on('roomJoined', onRoomJoined);
    socket.on('joinError', onJoinError);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('roomCreated', onRoomCreated);
      socket.off('roomJoined', onRoomJoined);
      socket.off('joinError', onJoinError);
    };
  }, [name]);

  function createRoom() {
    if (!name.trim()) { alert('Enter your name first.'); return; }
    if (!connected)   { alert('Not connected to server. Please wait...'); return; }
    setLoading(true);
    socket.emit('createRoom', { playerName: name.trim() });
  }

  function joinRoom() {
    if (!name.trim()) { alert('Enter your name first.'); return; }
    if (code.length !== 4) { alert('Room code must be 4 digits.'); return; }
    if (!connected)   { alert('Not connected to server. Please wait...'); return; }
    setLoading(true);
    socket.emit('joinRoom', { roomCode: code, playerName: name.trim() });
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <img src="/logo.png" alt="Mafia" style={s.logo} />
        <p style={s.subtitle}>THE SOCIAL DEDUCTION GAME</p>
        <span style={{ ...s.dot, background: connected ? '#2dc653' : '#555' }} />
      </div>

      <div style={s.card}>
        <label style={s.label}>YOUR NAME</label>
        <input
          style={s.input}
          placeholder="Enter your name..."
          value={name}
          onChange={e => setName(e.target.value.slice(0, 20))}
          maxLength={20}
          disabled={loading}
        />

        {mode === 'join' && (
          <>
            <label style={{ ...s.label, marginTop: 16 }}>ROOM CODE</label>
            <input
              style={{ ...s.input, ...s.codeInput }}
              placeholder="0000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              inputMode="numeric"
              disabled={loading}
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
            />
          </>
        )}

        {loading ? (
          <div style={s.spinner} />
        ) : mode === 'menu' ? (
          <div style={s.btnGroup}>
            <button style={s.primaryBtn} onClick={createRoom}>Create Room</button>
            <button style={s.secondaryBtn} onClick={() => setMode('join')}>Join Room</button>
          </div>
        ) : (
          <div style={s.btnGroup}>
            <button style={s.primaryBtn} onClick={joinRoom}>Join Room</button>
            <button style={s.ghostBtn} onClick={() => { setMode('menu'); setCode(''); }}>Back</button>
          </div>
        )}
      </div>

      <p style={s.footer}>{connected ? 'Connected to server' : 'Connecting to server...'}</p>
    </div>
  );
}

const s = {
  page: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100dvh', padding:'24px 20px' },
  header: { textAlign:'center', marginBottom:48 },
  logo: { width:'clamp(180px,40vw,280px)', height:'auto', marginBottom:8 },
  subtitle: { fontSize:12, color:'#555', letterSpacing:'0.3em', marginTop:8 },
  dot: { display:'inline-block', width:8, height:8, borderRadius:'50%', marginTop:12 },
  card: { background:'#14142a', border:'1px solid #1e1e3a', borderRadius:16, padding:'28px 24px', width:'100%', maxWidth:400 },
  label: { display:'block', color:'#666', fontSize:11, letterSpacing:'0.2em', marginBottom:8 },
  input: { width:'100%', background:'#0d0d1a', border:'1px solid #2a2a4a', borderRadius:10, padding:'14px 16px', color:'#fff', fontSize:16 },
  codeInput: { fontSize:28, letterSpacing:'0.4em', textAlign:'center', fontWeight:700 },
  btnGroup: { display:'flex', flexDirection:'column', gap:12, marginTop:28 },
  primaryBtn: { background:'#e63946', color:'#fff', borderRadius:12, padding:'16px', fontSize:16, fontWeight:700, letterSpacing:'0.05em' },
  secondaryBtn: { background:'#1e1e3a', color:'#ccc', borderRadius:12, padding:'16px', fontSize:16, fontWeight:600, border:'1px solid #2a2a4a' },
  ghostBtn: { background:'transparent', color:'#555', padding:'12px', fontSize:14 },
  spinner: { width:40, height:40, border:'3px solid #1e1e3a', borderTop:'3px solid #e63946', borderRadius:'50%', margin:'28px auto 0', animation:'spin 0.8s linear infinite' },
  footer: { color:'#333', fontSize:12, marginTop:32 },
};
