import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket.js';

const MIN_PLAYERS = { 1: 5, 2: 7, 3: 10 };

export default function Lobby({ navigate, params }) {
  const { roomCode, playerId, playerName, isHost: initHost, initialRoom } = params;
  const [room, setRoom] = useState(initialRoom || null);
  const [isHost, setIsHost] = useState(initHost);
  const gameStartedRef = useRef(false);

  useEffect(() => {
    const onRoomUpdated = (r) => setRoom(r);
    const onYouAreHost  = () => setIsHost(true);
    const onGameStarted = (gameData) => {
      gameStartedRef.current = true;
      navigate('game', { gameData, playerName, playerId });
    };
    const onGameError   = ({ message }) => alert(message);
    const onRoomNotFound = () => {
      alert('This room no longer exists.');
      navigate('home');
    };

    socket.on('roomUpdated', onRoomUpdated);
    socket.on('youAreHost', onYouAreHost);
    socket.on('gameStarted', onGameStarted);
    socket.on('gameError', onGameError);
    socket.on('roomNotFound', onRoomNotFound);
    socket.emit('getRoom', { roomCode });

    return () => {
      socket.off('roomUpdated', onRoomUpdated);
      socket.off('youAreHost', onYouAreHost);
      socket.off('gameStarted', onGameStarted);
      socket.off('gameError', onGameError);
      socket.off('roomNotFound', onRoomNotFound);
      if (!gameStartedRef.current) socket.emit('leaveRoom', { roomCode });
    };
  }, [roomCode]);

  if (!room) return <div style={s.loading}>Connecting to room...</div>;

  const mc = room.mafiaCount;
  const required = MIN_PLAYERS[mc];
  const count = room.players.length;
  const canStart = count >= required;

  function copyCode() {
    navigator.clipboard?.writeText(roomCode).then(() => alert('Copied!')).catch(() => {});
  }

  return (
    <div style={s.page}>
      {/* Room Code */}
      <div style={s.codeBanner} onClick={copyCode} title="Click to copy">
        <div style={s.codeLabel}>ROOM CODE</div>
        <div style={s.codeText}>{roomCode}</div>
        <div style={s.codeTip}>Click to copy</div>
      </div>

      {/* Count row */}
      <div style={s.countRow}>
        <span style={s.countText}>{count} {count === 1 ? 'Player' : 'Players'}</span>
        <span style={{ ...s.requireText, color: canStart ? '#2dc653' : '#e63946' }}>
          {canStart ? 'Ready to start!' : `Need ${required - count} more for ${mc} Mafia`}
        </span>
      </div>

      {/* Players */}
      <div style={s.playerList}>
        {room.players.map((p, i) => (
          <div key={p.id} style={s.playerRow}>
            <span style={s.playerIdx}>{i + 1}</span>
            <span style={s.playerName}>{p.name}</span>
            {p.id === room.hostId && <span style={s.hostBadge}>HOST</span>}
            {p.id === playerId    && <span style={s.youBadge}>YOU</span>}
          </div>
        ))}
      </div>

      {/* Host controls */}
      {isHost ? (
        <div style={s.hostPanel}>
          <div style={s.hostPanelLabel}>NUMBER OF MAFIAS</div>
          <div style={s.mafiaSel}>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                style={{ ...s.mafiaBtn, ...(mc === n ? s.mafiaBtnActive : {}) }}
                onClick={() => socket.emit('setMafiaCount', { roomCode, mafiaCount: n })}
              >
                <div style={{ ...s.mafiaBtnNum, color: mc === n ? '#e63946' : '#555' }}>{n}</div>
                <div style={{ ...s.mafiaBtnMin, color: mc === n ? '#e63946' : '#444' }}>min {MIN_PLAYERS[n]}p</div>
              </button>
            ))}
          </div>
          <button
            style={{ ...s.startBtn, ...(!canStart ? s.startBtnOff : {}) }}
            disabled={!canStart}
            onClick={() => socket.emit('startGame', { roomCode })}
          >
            {canStart ? 'Start Game' : `Waiting for ${required - count} more...`}
          </button>
        </div>
      ) : (
        <div style={s.waitPanel}>Waiting for host to start the game...</div>
      )}
    </div>
  );
}

const s = {
  page: { display:'flex', flexDirection:'column', minHeight:'100dvh', background:'#0d0d1a' },
  loading: { color:'#666', textAlign:'center', marginTop:120, fontSize:16 },
  codeBanner: { background:'#14142a', margin:'16px 16px 0', borderRadius:16, padding:'20px', textAlign:'center', border:'1px solid #2a2a4a', cursor:'pointer' },
  codeLabel: { color:'#555', fontSize:11, letterSpacing:'0.2em', marginBottom:6 },
  codeText: { fontSize:'clamp(36px,10vw,56px)', fontWeight:900, color:'#e63946', letterSpacing:'0.3em' },
  codeTip: { color:'#444', fontSize:11, marginTop:4 },
  countRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px 8px' },
  countText: { color:'#fff', fontSize:16, fontWeight:600 },
  requireText: { fontSize:13, fontWeight:500 },
  playerList: { flex:1, padding:'0 16px', overflowY:'auto' },
  playerRow: { display:'flex', alignItems:'center', background:'#14142a', borderRadius:12, padding:'12px 14px', marginBottom:8, border:'1px solid #1e1e3a' },
  playerIdx: { width:28, height:28, borderRadius:14, background:'#1e1e3a', display:'flex', alignItems:'center', justifyContent:'center', color:'#666', fontSize:13, fontWeight:600, marginRight:12, flexShrink:0 },
  playerName: { color:'#fff', fontSize:16, fontWeight:500, flex:1 },
  hostBadge: { background:'#ffd700', color:'#0d0d1a', borderRadius:6, padding:'3px 8px', fontSize:10, fontWeight:800, letterSpacing:'0.08em', marginLeft:6 },
  youBadge: { background:'#1e1e3a', color:'#888', borderRadius:6, padding:'3px 8px', fontSize:10, fontWeight:700, letterSpacing:'0.08em', marginLeft:6, border:'1px solid #3a3a5a' },
  hostPanel: { background:'#14142a', borderTop:'1px solid #1e1e3a', padding:20 },
  hostPanelLabel: { color:'#555', fontSize:11, letterSpacing:'0.15em', marginBottom:14, textAlign:'center' },
  mafiaSel: { display:'flex', gap:10, marginBottom:16 },
  mafiaBtn: { flex:1, background:'#0d0d1a', border:'1px solid #2a2a4a', borderRadius:12, padding:'12px 8px', cursor:'pointer', textAlign:'center' },
  mafiaBtnActive: { background:'#3a0a10', border:'1px solid #e63946' },
  mafiaBtnNum: { fontSize:24, fontWeight:800 },
  mafiaBtnMin: { fontSize:10, marginTop:2 },
  startBtn: { width:'100%', background:'#e63946', color:'#fff', borderRadius:14, padding:'18px', fontSize:17, fontWeight:700, letterSpacing:'0.03em' },
  startBtnOff: { background:'#2a2a2a', cursor:'not-allowed' },
  waitPanel: { padding:28, textAlign:'center', color:'#555', fontSize:14, borderTop:'1px solid #1e1e3a' },
};
