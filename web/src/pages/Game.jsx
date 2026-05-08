import React from 'react';

const ROLES = {
  Mafia:     { color:'#e63946', bg:'#1a0508', message:"You're a Mafia.\nEliminate people to win." },
  Organizer: { color:'#ffd700', bg:'#1a1500', message:"You're the Organizer.\nGuide the game for everyone." },
  Detective: { color:'#9d4edd', bg:'#110520', message:"You're the Detective.\nFind out who the Mafia is." },
  Angel:     { color:'#90e0ef', bg:'#031a20', message:"You're an Angel.\nYou can save people from getting killed." },
  Villager:  { color:'#57cc99', bg:'#041510', message:"You're a Villager.\nSurvive to win." },
};
const ROLE_ORDER = ['Organizer','Detective','Angel','Mafia','Villager'];

function rc(role) { return ROLES[role] || ROLES.Villager; }

export default function Game({ navigate, params }) {
  const { gameData } = params;
  const { role, organizerName, mafiaNames, allPlayers } = gameData;
  const cfg = rc(role);

  /* Organizer sees full list */
  if (role === 'Organizer') {
    const sorted = [...(allPlayers||[])].sort((a,b)=>ROLE_ORDER.indexOf(a.role)-ROLE_ORDER.indexOf(b.role));
    return (
      <div style={{...s.page, background: cfg.bg}}>
        <div style={{...s.orgBanner, borderColor:'rgba(255,215,0,0.25)'}}>
          <span style={{color:'#ffd700', fontSize:12, letterSpacing:'0.2em', fontWeight:700}}>YOU ARE THE ORGANIZER</span>
        </div>
        <div style={s.roleCenter}>
          <div style={{...s.roleTitle, color:cfg.color, fontSize:'clamp(40px,12vw,72px)'}}>ORGANIZER</div>
          <div style={{...s.divider, background:cfg.color}} />
          <div style={s.roleMsg}>{cfg.message}</div>
        </div>
        <div style={s.allPlayersPanel}>
          <div style={s.allPlayersHeader}>ALL PLAYERS &amp; ROLES</div>
          <div style={s.allPlayersList}>
            {sorted.map((p,i) => {
              const pc = rc(p.role);
              return (
                <div key={i} style={s.allPlayerRow}>
                  <span style={s.allPlayerName}>{p.name}</span>
                  <span style={{...s.rolePill, color:pc.color, background:pc.color+'22', borderColor:pc.color+'66'}}>{p.role}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* Standard player */
  return (
    <div style={{...s.page, background: cfg.bg}}>
      {/* Organizer bar */}
      <div style={s.orgBar}>
        <span style={s.orgLabel}>ORGANIZER</span>
        <span style={s.orgName}>{organizerName}</span>
      </div>

      {/* Role reveal */}
      <div style={s.roleCenter}>
        <div style={{...s.roleTitle, color:cfg.color, fontSize:'clamp(40px,14vw,88px)', whiteSpace:'nowrap'}}>
          {role.toUpperCase()}
        </div>
        <div style={{...s.divider, background:cfg.color}} />
        <div style={s.roleMsg}>{cfg.message}</div>
      </div>

      {/* Mafia partners */}
      {role === 'Mafia' && (
        <div style={s.mafiaPanel}>
          <div style={s.mafiaPanelLabel}>
            {mafiaNames.length > 0 ? 'YOUR MAFIA PARTNERS' : 'YOU ARE THE LONE MAFIA'}
          </div>
          {mafiaNames.length > 0
            ? mafiaNames.map((n,i) => (
                <div key={i} style={s.mafiaNameRow}>
                  <span style={s.mafiaDot} />
                  <span style={s.mafiaName}>{n}</span>
                </div>
              ))
            : <div style={s.mafiaSolo}>Act carefully. No one else knows.</div>
          }
        </div>
      )}
    </div>
  );
}

const s = {
  page: { display:'flex', flexDirection:'column', minHeight:'100dvh' },
  orgBar: { display:'flex', alignItems:'center', gap:12, padding:'14px 20px', background:'rgba(255,215,0,0.1)', borderBottom:'1px solid rgba(255,215,0,0.2)' },
  orgLabel: { color:'#ffd700', fontSize:11, letterSpacing:'0.25em', fontWeight:700 },
  orgName: { color:'#ffd700', fontSize:20, fontWeight:800 },
  orgBanner: { padding:'14px', textAlign:'center', borderBottom:'1px solid' },
  roleCenter: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 32px' },
  roleTitle: { fontWeight:900, letterSpacing:'0.05em', textAlign:'center', textShadow:'0 0 60px currentColor' },
  divider: { width:60, height:3, borderRadius:2, margin:'24px 0', opacity:0.8 },
  roleMsg: { fontSize:'clamp(16px,4vw,22px)', color:'#ccc', textAlign:'center', lineHeight:1.6, fontWeight:300, whiteSpace:'pre-line' },
  mafiaPanel: { background:'rgba(230,57,70,0.12)', borderTop:'1px solid rgba(230,57,70,0.3)', padding:'24px' },
  mafiaPanelLabel: { color:'#e63946', fontSize:11, letterSpacing:'0.2em', fontWeight:700, marginBottom:14, textAlign:'center' },
  mafiaNameRow: { display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 },
  mafiaDot: { width:8, height:8, borderRadius:'50%', background:'#e63946', marginRight:12, flexShrink:0 },
  mafiaName: { color:'#fff', fontSize:20, fontWeight:600 },
  mafiaSolo: { color:'#888', fontSize:14, textAlign:'center', fontStyle:'italic' },
  allPlayersPanel: { padding:'0 20px 20px' },
  allPlayersHeader: { color:'#555', fontSize:11, letterSpacing:'0.2em', marginBottom:12, textAlign:'center' },
  allPlayersList: { display:'flex', flexDirection:'column', gap:8, maxHeight:340, overflowY:'auto' },
  allPlayerRow: { display:'flex', alignItems:'center', background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'12px 16px' },
  allPlayerName: { flex:1, color:'#fff', fontSize:16, fontWeight:500 },
  rolePill: { borderRadius:8, padding:'4px 10px', fontSize:12, fontWeight:700, letterSpacing:'0.04em', border:'1px solid' },
};
