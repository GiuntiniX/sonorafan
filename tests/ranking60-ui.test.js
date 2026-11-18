'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Ranking 6.0 replaces legacy 420px modal and keeps five functional sections',()=>{
 const html=read('public/index.html');
 const js=read('public/sonorafan-ranking-60.js');
 assert(html.includes('id="lbModal"'));
 assert(html.includes('sf60-ranking-modal'));
 assert(!html.includes('id="lbList"'));
 for(const key of ['ranking','progress','medals','challenges','hall'])
   assert(html.includes('data-sf60-tab="'+key+'"'),key);
 assert(html.includes('window.sf60Ranking.open()'));
 assert(js.includes("window.sf60Ranking={open,close}"));
});
test('Ranking 6.0 has real API actions, safe escaping and no client-created XP',()=>{
 const ui=read('public/sonorafan-ranking-60.js');
 const server=read('ranking-60.js');
 assert(ui.includes("credentials:'include'"));
 for(const endpoint of ['/api/ranking60?','/api/ranking60/me','/api/ranking60/hall','/api/ranking60/preferences'])
   assert(ui.includes(endpoint),endpoint);
 assert(ui.includes("replace(/[&<>"));
 assert(ui.includes('data-sf60-visibility'));
 assert(ui.includes('data-sf60-medal'));
 assert(ui.includes('data-sf60-compare'));
 assert(ui.includes('sf60-podium'));
 assert(ui.includes('sf60-leader-list'));
 assert(ui.includes('max 50')===false,'client should not fabricate a rank');
 assert(!ui.includes('localStorage.setItem'));
 assert(server.includes("function createRanking60"));
 assert(server.includes("await db.runTransaction"));
 assert(server.includes("already_awarded"));
 assert(server.includes("daily_limit"));
 assert(!server.includes("req.body?.xp"),'client cannot submit XP directly');
});
test('Ranking 6.0 mobile CSS is in document head, accessible and aligned to visual guide',()=>{
 const html=read('public/index.html'),css=read('public/sonorafan-ranking-60.css');
 const head=html.slice(0,html.indexOf('</head>'));
 assert(head.includes('/sonorafan-ranking-60.css?v=600.0'));
 assert(html.includes('/sonorafan-ranking-60.js?v=600.0'));
 assert(css.includes('#caff00'));
 assert(css.includes('max-width:700px'));
 assert(css.includes('100dvh'));
 assert(css.includes(':focus-visible'));
 assert(html.includes('aria-modal="true"'));
 assert(html.includes('aria-live="polite"'));
});
test('Ranking 6.0 preserves old XP routes, does not merge forum reputation into music',()=>{
 const server=read('server.js'),gamification=read('gamification-45.js');
 assert(server.includes("app.get('/api/leaderboard'"),'keep legacy ranking API');
 assert(server.includes('createRanking60'));
 assert(server.includes('ranking60, rawCoverParser'));
 assert(gamification.includes("createGamification45"));
 assert(gamification.includes("ranking60Weeks"));
 assert(gamification.includes("ranking60Months"));
 assert(gamification.includes("if(next.gained>0)"));
 assert(gamification.includes("if(action==='song'"));
 assert(read('fan-clubs-71.js').includes('awardForumReputation'));
});
