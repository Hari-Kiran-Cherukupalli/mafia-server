import React, { useState, useRef, useCallback } from 'react';

const ROLES = {
  Mafia:     { color:'#e63946', bg:'#1a0508', message:"You're a Mafia.\nEliminate people to win." },
  Organizer: { color:'#ffd700', bg:'#1a1500', message:"You're the Organizer.\nGuide the game for everyone." },
  Detective: { color:'#9d4edd', bg:'#110520', message:"You're the Detective.\nFind out who the Mafia is." },
  Angel:     { color:'#90e0ef', bg:'#031a20', message:"You're an Angel.\nYou can save people from getting killed." },
  Villager:  { color:'#57cc99', bg:'#041510', message:"You're a Villager.\nSurvive to win." },
};
const ROLE_ORDER = ['Organizer','Detective','Angel','Mafia','Villager'];
const CHEAT = [1, 3, 2];

function rc(role) { return ROLES[role] || ROLES.Villager; }

// ── 1-3-2 cheat code hook ────────────────────────────────────────────────
function useCheatCode(onSuccess) {
  const stage = useRef(0);
  const count = useRef(0);
  const timer = useRef(null);

  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    count.current += 1;
    timer.current = setTimeout(() => {
      if (count.current === CHEAT[stage.current]) {
        stage.current += 1;
        if (stage.current === CHEAT.length) { stage.current = 0; onSuccess(); }
      } else {
        stage.current = 0;
      }
      count.current = 0;
    }, 600);
  }, [onSuccess]);
}

// ── All-roles overlay ────────────────────────────────────────────────────
function AllRolesOverlay({ allPlayers, onClose }) {
  const sorted = [...(allPlayers||[])].sort((a,b)=>ROLE_ORDER.indexOf(a.role)-ROLE_ORDER.indexOf(b.role));
  return (
    <div style={ov.container}>
      <div style={ov.inner}>
        <div style={ov.header}>
          <div style={ov.title}>ALL CHARACTERS</div>
          <div style={ov.subtitle}>Secret cheat code activated</div>
        </div>
        <div style={ov.list}>
          {sorted.map((p,i)=>{
            const c = rc(p.role);
            return (
              <div key={i} style={ov.row}>
                <span style={ov.pname}>{p.name}</span>
                <span style={{...ov.pill, color:c.color, background:c.color+'22', borderColor:c.color+'55'}}>{p.role}</span>
              </div>
            );
          })}
        </div>
        <button style={ov.closeBtn} onClick={onClose}>Back to My Role</button>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────
export default function Game({ params }) {
  const { gameData, playerName } = params;
  const { role, organizerName, mafiaNames, allPlayers } = gameData;
  const cfg = rc(role);
  const [showCheat, setShowCheat] = useState(false);
  const handleTap = useCheatCode(() => setShowCheat(true));

  const sorted = [...(allPlayers||[])].sort((a,b)=>ROLE_ORDER.indexOf(a.role)-ROLE_ORDER.indexOf(b.role));

  return (
    <div style={{...s.page, background: cfg.bg}}>
      {/* Top bar: Organizer name left, Your name right */}
      <div style={s.topBar}>
        <div>
          <div style={s.orgLabel}>ORGANIZER</div>
          <div style={s.orgName}>{organizerName}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={s.youLabel}>YOU</div>
          <div style={s.youName}>{playerName}</div>
        </div>
      </div>

      {/* Role reveal — tap/click triggers cheat sequence */}
      <div style={s.roleCenter} onClick={handleTap} title="Tap 1-3-2 times for secret reveal">
        <div style={{...s.roleTitle, color:cfg.color, fontSize:'clamp(40px,14vw,88px)', whiteSpace:'nowrap'}}>
          {role.toUpperCase()}
        </div>
        <div style={{...s.divider, background:cfg.color}} />
        <div style={s.roleMsg}>{cfg.message}</div>
        <div style={s.tapHint}>Tap to reveal secrets (1-3-2)</div>
      </div>

      {/* Mafia partners */}
      {role === 'Mafia' && (
        <div style={s.mafiaPanel}>
          <div style={s.mafiaPanelLabel}>
            {mafiaNames.length > 0 ? 'YOUR MAFIA PARTNERS' : 'YOU ARE THE LONE MAFIA'}
          </div>
          {mafiaNames.length > 0
            ? mafiaNames.map((n,i)=>(
                <div key={i} style={s.mafiaRow}>
                  <span style={s.mafiaDot}/><span style={s.mafiaName}>{n}</span>
                </div>
              ))
            : <div style={s.mafiaSolo}>Act carefully. No one else knows.</div>
          }
        </div>
      )}

      {/* Organizer full list */}
      {role === 'Organizer' && (
        <div style={s.orgPanel}>
          <div style={s.orgPanelHeader}>ALL PLAYERS &amp; ROLES</div>
          <div style={s.orgList}>
            {sorted.map((p,i)=>{
              const pc = rc(p.role);
              return (
                <div key={i} style={s.orgRow}>
                  <span style={s.orgRowName}>{p.name}</span>
                  <span style={{...s.rolePill, color:pc.color, background:pc.color+'22', borderColor:pc.color+'55'}}>{p.role}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCheat && <AllRolesOverlay allPlayers={allPlayers} onClose={()=>setShowCheat(false)} />}
    </div>
  );
}

const s = {
  page: { display:'flex', flexDirection:'column', minHeight:'100dvh', position:'relative' },
  topBar: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'12px 20px', background:'rgba(255,215,0,0.1)',
    borderBottom:'1px solid rgba(255,215,0,0.2)',
  },
  orgLabel: { color:'#ffd700', fontSize:9, letterSpacing:'0.2em', fontWeight:700 },
  orgName:  { color:'#ffd700', fontSize:18, fontWeight:800 },
  youLabel: { color:'#aaa', fontSize:9, letterSpacing:'0.2em', fontWeight:700 },
  youName:  { color:'#fff', fontSize:18, fontWeight:700 },
  roleCenter: {
    flex:1, display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', padding:'24px 32px', cursor:'pointer', userSelect:'none',
    minHeight:300,
  },
  roleTitle: { fontWeight:900, letterSpacing:'0.05em', textAlign:'center', textShadow:'0 0 60px currentColor' },
  divider: { width:60, height:3, borderRadius:2, margin:'24px 0', opacity:0.8 },
  roleMsg: { fontSize:'clamp(16px,4vw,22px)', color:'#ccc', textAlign:'center', lineHeight:1.6, fontWeight:300, whiteSpace:'pre-line' },
  tapHint: { color:'#333', fontSize:11, marginTop:24, letterSpacing:'0.1em' },
  mafiaPanel: { background:'rgba(230,57,70,0.12)', borderTop:'1px solid rgba(230,57,70,0.3)', padding:24 },
  mafiaPanelLabel: { color:'#e63946', fontSize:11, letterSpacing:'0.2em', fontWeight:700, marginBottom:14, textAlign:'center' },
  mafiaRow: { display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 },
  mafiaDot: { width:8, height:8, borderRadius:'50%', background:'#e63946', marginRight:12, flexShrink:0, display:'inline-block' },
  mafiaName: { color:'#fff', fontSize:20, fontWeight:600 },
  mafiaSolo: { color:'#888', fontSize:14, textAlign:'center', fontStyle:'italic' },
  orgPanel: { padding:'0 20px 20px' },
  orgPanelHeader: { color:'#555', fontSize:11, letterSpacing:'0.2em', marginBottom:12, textAlign:'center' },
  orgList: { display:'flex', flexDirection:'column', gap:8, maxHeight:340, overflowY:'auto' },
  orgRow: { display:'flex', alignItems:'center', background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'12px 16px' },
  orgRowName: { flex:1, color:'#fff', fontSize:16, fontWeight:500 },
  rolePill: { borderRadius:8, padding:'4px 10px', fontSize:12, fontWeight:700, letterSpacing:'0.04em', border:'1px solid' },
};

const ov = {
  container: { position:'fixed', inset:0, background:'#0a0a18', zIndex:1000, display:'flex', flexDirection:'column' },
  inner: { display:'flex', flexDirection:'column', flex:1, maxWidth:480, margin:'0 auto', width:'100%' },
  header: { padding:'28px 24px', textAlign:'center', borderBottom:'1px solid #1e1e3a' },
  title: { color:'#fff', fontSize:28, fontWeight:900, letterSpacing:'0.15em' },
  subtitle: { color:'#e63946', fontSize:12, letterSpacing:'0.15em', marginTop:6 },
  list: { flex:1, padding:'20px 20px 0', overflowY:'auto', display:'flex', flexDirection:'column', gap:10 },
  row: { display:'flex', alignItems:'center', background:'#14142a', borderRadius:12, padding:'14px 16px', border:'1px solid #1e1e3a' },
  pname: { flex:1, color:'#fff', fontSize:17, fontWeight:600 },
  pill: { borderRadius:8, padding:'5px 12px', fontSize:13, fontWeight:700, letterSpacing:'0.04em', border:'1px solid' },
  closeBtn: { margin:20, background:'#1e1e3a', color:'#ccc', borderRadius:14, padding:'16px', fontSize:16, fontWeight:600, border:'1px solid #3a3a5a', cursor:'pointer' },
};
