import React, { useState, useEffect } from "react";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@300;400;500&family=Instrument+Sans:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #F5F0E8; --ink: #1A1510; --ink60: rgba(26,21,16,0.6); --ink20: rgba(26,21,16,0.12);
    --gold: #C9A84C; --goldl: #E8D5A0; --rust: #C14B2A; --sage: #4A6741;
    --paper: #FAF7F2; --card: #FFFFFF; --border: rgba(26,21,16,0.1);
    --shadow: 0 2px 16px rgba(26,21,16,0.08); --r: 2px; --violet: #5C4B8A;
  }
  body { background:var(--cream); color:var(--ink); font-family:'Instrument Sans',sans-serif; min-height:100vh; line-height:1.6; }
  .app { display:flex; min-height:100vh; }
  .sidebar { width:230px; min-height:100vh; background:var(--ink); color:var(--cream); display:flex; flex-direction:column; position:fixed; left:0; top:0; bottom:0; z-index:100; }
  .sb-logo { padding:24px 22px 16px; border-bottom:1px solid rgba(245,240,232,0.08); }
  .sb-logo h1 { font-family:'Playfair Display',serif; font-size:19px; font-weight:700; color:var(--goldl); letter-spacing:-0.3px; }
  .sb-logo p { font-size:9px; color:rgba(245,240,232,0.35); letter-spacing:2px; text-transform:uppercase; margin-top:3px; font-family:'DM Mono',monospace; }
  .sb-nav { flex:1; padding:12px 8px; overflow-y:auto; }
  .sb-sec { font-size:8.5px; letter-spacing:2px; text-transform:uppercase; color:rgba(245,240,232,0.28); font-family:'DM Mono',monospace; padding:0 12px; margin:16px 0 4px; }
  .sb-item { display:flex; align-items:center; gap:9px; padding:8px 12px; border-radius:var(--r); cursor:pointer; font-size:12.5px; color:rgba(245,240,232,0.6); transition:all 0.15s; border:1px solid transparent; margin-bottom:1px; }
  .sb-item:hover { color:var(--cream); background:rgba(245,240,232,0.07); }
  .sb-item.active { color:var(--goldl); background:rgba(201,168,76,0.13); border-color:rgba(201,168,76,0.22); }
  .sb-item .ni { font-size:13px; width:16px; text-align:center; flex-shrink:0; }
  .sb-badge { margin-left:auto; background:var(--rust); color:white; font-size:9px; font-family:'DM Mono',monospace; padding:1px 6px; border-radius:10px; }
  .sb-foot { padding:12px 20px; border-top:1px solid rgba(245,240,232,0.07); font-size:9.5px; color:rgba(245,240,232,0.28); font-family:'DM Mono',monospace; line-height:1.9; }
  .main { margin-left:230px; flex:1; display:flex; flex-direction:column; }
  .topbar { background:var(--paper); border-bottom:1px solid var(--border); padding:13px 30px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:50; }
  .tb-title { font-family:'Playfair Display',serif; font-size:18px; font-weight:400; }
  .tb-meta { font-size:10.5px; color:var(--ink60); font-family:'DM Mono',monospace; text-align:right; line-height:1.8; }
  .pg { padding:28px 30px; flex:1; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:var(--r); box-shadow:var(--shadow); padding:22px; margin-bottom:16px; }
  .ct { font-family:'Playfair Display',serif; font-size:15px; font-weight:700; margin-bottom:13px; display:flex; align-items:center; gap:9px; }
  .ct .cta { margin-left:auto; display:flex; gap:7px; }
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
  .g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .sc { background:var(--card); border:1px solid var(--border); border-radius:var(--r); padding:16px; position:relative; overflow:hidden; }
  .sc::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
  .sc.gold::before{background:var(--gold)} .sc.rust::before{background:var(--rust)} .sc.sage::before{background:var(--sage)} .sc.ink::before{background:var(--ink)} .sc.violet::before{background:var(--violet)}
  .sl { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink60); font-family:'DM Mono',monospace; margin-bottom:6px; }
  .sv { font-family:'Playfair Display',serif; font-size:28px; font-weight:700; line-height:1; }
  .ss { font-size:10px; color:var(--ink60); margin-top:4px; }
  .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 15px; border-radius:var(--r); font-size:12.5px; font-weight:500; cursor:pointer; transition:all 0.15s; border:1px solid transparent; font-family:'Instrument Sans',sans-serif; white-space:nowrap; }
  .bp { background:var(--ink); color:var(--cream); } .bp:hover{background:#2d2820}
  .bg { background:var(--gold); color:var(--ink); } .bg:hover{background:#b8973e}
  .bo { background:transparent; color:var(--ink); border-color:var(--border); } .bo:hover{background:var(--cream)}
  .br { background:var(--rust); color:white; }
  .bsa { background:var(--sage); color:white; }
  .bv { background:var(--violet); color:white; }
  .bgh { background:transparent; color:var(--ink60); border:none; } .bgh:hover{color:var(--ink);background:var(--cream)}
  .bsm { padding:5px 10px; font-size:11.5px; }
  .btn:disabled { opacity:0.38; cursor:not-allowed; }
  .inp,.ta,.sel { width:100%; padding:9px 12px; border:1px solid var(--border); border-radius:var(--r); font-size:13.5px; font-family:'Instrument Sans',sans-serif; background:var(--paper); color:var(--ink); transition:border 0.15s; outline:none; }
  .ta { resize:vertical; min-height:110px; line-height:1.65; }
  .inp:focus,.ta:focus,.sel:focus { border-color:var(--gold); background:white; }
  .fg { margin-bottom:13px; }
  .lbl { display:block; font-size:10.5px; font-weight:500; margin-bottom:4px; color:var(--ink60); letter-spacing:0.3px; text-transform:uppercase; }
  .tag { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:500; font-family:'DM Mono',monospace; }
  .tg { background:var(--goldl); color:#7a5a1a; }
  .tr { background:#f5e0da; color:var(--rust); }
  .ts { background:#deeadc; color:var(--sage); }
  .ti { background:var(--ink20); color:var(--ink); }
  .tb { background:#dde8f5; color:#2a5c8a; }
  .tv { background:#eae5f5; color:var(--violet); }
  .tprov { background:#C9A84C22; color:#7a5a1a; border:1px solid var(--gold); }
  .ttest { background:#5C4B8A11; color:var(--violet); border:1px solid #5C4B8A44; }
  .li { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); }
  .li:last-child { border-bottom:none; }
  .lidate { font-size:9.5px; font-family:'DM Mono',monospace; color:var(--ink60); width:50px; flex-shrink:0; padding-top:2px; }
  .libody { flex:1; min-width:0; }
  .lititle { font-weight:600; font-size:13.5px; margin-bottom:3px; }
  .liprev { font-size:12px; color:var(--ink60); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .limetrics { display:flex; gap:10px; margin-top:5px; }
  .mp { font-size:10px; font-family:'DM Mono',monospace; color:var(--ink60); }
  .mp strong { color:var(--ink); }
  .mp.hl strong { color:var(--gold); }
  .kbi { border:1px solid var(--border); border-radius:var(--r); padding:13px 15px; margin-bottom:9px; background:var(--paper); transition:all 0.15s; }
  .kbi:hover { border-color:var(--gold); background:white; }
  .kbi.proven { border-color:rgba(201,168,76,0.5); background:rgba(201,168,76,0.04); }
  .kbih { display:flex; align-items:flex-start; gap:9px; margin-bottom:5px; }
  .kbit { font-weight:600; font-size:13px; flex:1; }
  .kbib { font-size:12px; color:var(--ink60); line-height:1.6; }
  .kbif { margin-top:9px; display:flex; gap:5px; align-items:center; flex-wrap:wrap; }
  .fc { border:1px solid var(--border); border-radius:var(--r); padding:15px; background:white; position:relative; margin-bottom:11px; }
  .fc.proven { border-color:rgba(201,168,76,0.6); } .fc.testing { border-color:rgba(92,75,138,0.4); }
  .fcbadge { position:absolute; top:11px; right:11px; }
  .fcname { font-weight:700; font-size:14px; margin-bottom:3px; }
  .fcdesc { font-size:12px; color:var(--ink60); margin-bottom:9px; line-height:1.5; }
  .fcstats { display:flex; gap:12px; margin-bottom:10px; }
  .fcs { font-size:10px; font-family:'DM Mono',monospace; color:var(--ink60); }
  .fcs strong { color:var(--ink); font-size:15px; font-family:'Playfair Display',serif; display:block; }
  .tabs { display:flex; gap:0; border-bottom:1px solid var(--border); margin-bottom:18px; }
  .tab { padding:8px 16px; font-size:12.5px; cursor:pointer; color:var(--ink60); border-bottom:2px solid transparent; margin-bottom:-1px; transition:all 0.15s; }
  .tab.active { color:var(--ink); border-bottom-color:var(--ink); font-weight:500; }
  .pipe { display:flex; border-bottom:1px solid var(--border); margin-bottom:22px; }
  .ps { flex:1; text-align:center; padding:10px 6px; font-size:9.5px; font-family:'DM Mono',monospace; letter-spacing:0.5px; text-transform:uppercase; color:var(--ink60); border-bottom:2px solid transparent; margin-bottom:-1px; cursor:pointer; transition:all 0.15s; }
  .ps.active { color:var(--gold); border-bottom-color:var(--gold); font-weight:500; }
  .ps .psn { font-size:16px; font-family:'Playfair Display',serif; display:block; margin-bottom:2px; }
  .div { height:1px; background:var(--border); margin:16px 0; }
  .es { text-align:center; padding:40px 24px; color:var(--ink60); }
  .es .esi { font-size:36px; margin-bottom:9px; }
  .alert { padding:10px 14px; border-radius:var(--r); font-size:12.5px; margin-bottom:13px; line-height:1.55; }
  .ag { background:rgba(201,168,76,0.09); border:1px solid rgba(201,168,76,0.28); color:#7a5a1a; }
  .ar { background:rgba(193,75,42,0.07); border:1px solid rgba(193,75,42,0.2); color:var(--rust); }
  .av { background:rgba(92,75,138,0.07); border:1px solid rgba(92,75,138,0.2); color:var(--violet); }
  .as2 { background:rgba(74,103,65,0.07); border:1px solid rgba(74,103,65,0.2); color:var(--sage); }
  .f { display:flex; } .fac { align-items:center; } .fjb { justify-content:space-between; } .fw { flex-wrap:wrap; }
  .g4x{gap:4px} .g8{gap:8px} .g12{gap:12px} .g16{gap:16px}
  .mb4{margin-bottom:4px} .mb8{margin-bottom:8px} .mb12{margin-bottom:12px} .mb16{margin-bottom:16px} .mb20{margin-bottom:20px} .mb24{margin-bottom:24px}
  .mt8{margin-top:8px} .mt12{margin-top:12px} .mt16{margin-top:16px}
  .mla{margin-left:auto} .w100{width:100%} .serif{font-family:'Playfair Display',serif} .mono{font-family:'DM Mono',monospace}
  .sm{font-size:12.5px} .xs{font-size:10.5px; font-family:'DM Mono',monospace} .muted{color:var(--ink60)}
  .spin { display:inline-block; width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:sp 0.7s linear infinite; }
  .spin-d { border-color:var(--ink20); border-top-color:var(--ink); }
  @keyframes sp { to{transform:rotate(360deg)} }
  .pb { height:5px; background:var(--ink20); border-radius:3px; overflow:hidden; margin-top:7px; }
  .pf { height:100%; border-radius:3px; transition:width 0.5s; }
  .sb2 { display:flex; align-items:center; gap:7px; }
  .st { flex:1; height:4px; background:var(--ink20); border-radius:2px; }
  .sf { height:100%; border-radius:2px; background:var(--gold); }
  .rp { background:rgba(92,75,138,0.06); border:1px dashed rgba(92,75,138,0.35); border-radius:var(--r); padding:15px; margin-bottom:11px; }
  .vc { border:1px solid var(--border); border-radius:var(--r); padding:14px; margin-bottom:10px; background:var(--paper); cursor:pointer; transition:all 0.15s; }
  .vc:hover,.vc.sel { border-color:var(--gold); background:white; box-shadow:0 0 0 2px rgba(201,168,76,0.15); }
  .vp { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; font-family:'DM Mono',monospace; color:var(--ink60); margin-bottom:6px; }
  .vt { font-size:13px; line-height:1.65; color:var(--ink); white-space:pre-wrap; }
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  th{text-align:left;padding:8px 12px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Mono',monospace;color:var(--ink60);border-bottom:1px solid var(--border);font-weight:500}
  td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
  tr:last-child td{border-bottom:none} tr:hover td{background:var(--cream)}
  .mc { border-left:3px solid var(--gold); padding-left:13px; margin-bottom:16px; }
  .mct { font-family:'Playfair Display',serif; font-size:14px; font-weight:700; margin-bottom:9px; }
  .me { padding:9px 0; border-bottom:1px solid var(--border); }
  .me:last-child{border-bottom:none}
  .met { font-weight:600; font-size:13px; margin-bottom:3px; }
  .meb { font-size:12px; color:var(--ink60); line-height:1.55; }
  .pulse { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--sage); margin-right:6px; animation:pls 2s infinite; }
  @keyframes pls { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
  .rdot { width:6px; height:6px; border-radius:50%; background:var(--rust); display:inline-block; margin-right:5px; }
  .abr { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .abc { border:1px solid var(--border); border-radius:var(--r); padding:13px; background:var(--paper); }
  .abc.win { border-color:var(--gold); background:rgba(201,168,76,0.06); }
  .abl { font-size:9px; letter-spacing:2px; text-transform:uppercase; font-family:'DM Mono',monospace; color:var(--ink60); margin-bottom:5px; }
  .abt { font-size:12.5px; line-height:1.6; white-space:pre-wrap; }
`;

// ─── SEED DATA ───────────────────────────────────────────────────────────────
const SEED_POSTS = [];

const SEED_FORMATS = [
  { id:1, name:"Contrarian Take", description:"Open with the conventional wisdom, flip it, end with the earned conclusion.", example:"Everyone says X. Here's why that's wrong...", status:"proven", avgDocViews:0, avgCalls:0, postsUsed:0, notes:"Works best when Stephen has a strong personal opinion. LinkedIn." },
  { id:2, name:"Problem → Insight → CTA", description:"Name the pain precisely, reveal the non-obvious cause, point to the offer doc.", example:"You're working 60hr weeks. Not because you're inefficient...", status:"proven", avgDocViews:0, avgCalls:0, postsUsed:0, notes:"Solid workhorse. Converts consistently across themes." },
  { id:3, name:"Framework Drop", description:"Present a named mental model. Make it feel proprietary.", example:"The Delegation Ladder has 5 rungs. Most owners are stuck on rung 2...", status:"testing", avgDocViews:0, avgCalls:0, postsUsed:0, notes:"Testing on Instagram. High engagement, low conversion so far." },
  { id:4, name:"Observation + Principle", description:"Field observation → universal principle.", example:"After 18 months watching $2M–$5M owners...", status:"testing", avgDocViews:0, avgCalls:0, postsUsed:0, notes:"Promising. Second test running." },
  { id:5, name:"Client Story Arc", description:"Before state → intervention → result. Specific numbers required.", example:"Before: $3.2M, working Sundays. Intervention: GM install. After: owner working 3 days...", status:"proposed", avgDocViews:0, avgCalls:0, postsUsed:0, notes:"AI proposed. High conversion in similar niches. Not yet tested." },
];

const SEED_MIND = {
  frameworks: [
    { id:1, title:"The Delegation Ladder", body:"5 rungs: Do → Delegate with instruction → Delegate with oversight → Delegate with check-in → Full autonomy. Most owners are stuck at rung 2 because they've never documented the job properly.", tags:["core","GM install"] },
    { id:2, title:"Owner ↔ Operator Split", body:"The owner's job is to build the business. The operator's job is to run it. When one person does both, neither gets done properly. The GM Install separates these permanently.", tags:["core","positioning"] },
    { id:3, title:"The $5M Ceiling", body:"Most founders hit an invisible ceiling at $3M–$5M because they're both visionary and integrator. Installing a GM breaks through without needing new strategy.", tags:["growth","targeting"] },
    { id:4, title:"BGB Results Stat", body:"On average, BGB members see a 41% increase in revenue in the first 6 months of joining. Use this as a proof point — not as a promise, but as a pattern across the membership.", tags:["proof","stats","results"] },
  ],
  clientStories: [
    { id:1, title:"Mike — Marketing Agency, 60% revenue growth", body:"8-person agency. Every function relied on Mike — lead gen, sales, client service, management, finance, admin. Working 7 days a week. Strong revenue but no profit. Implemented Sales Process Optimiser: conversion jumped from 32% to 65%. Structured Meeting Rhythm stopped the team interrupting him. Who Does What system lifted team output 30%. Result: revenue up 60%, breaks profit records month after month. Travels freely, rides his dirt bike weekly, present for every kids' sporting event.", tags:["result","sales","team","marketing"] },
    { id:2, title:"Marco — Commercial Construction, GM install after partner buyout", body:"Bought out his business partner and found himself running a large company totally reliant on him. Nearly two decades in the industry — knew he couldn't sustain 60-hour weeks. Went through the BGB GM Preparation Process, ran the Upside Down Recruitment, onboarded his GM using the Peak Performance Onramp, and implemented the Desert Island Dashboard. Result: Marco barely works. Travels constantly, pursues his love of music and rare cars. He is moving to Dubai. As he says: Why not?", tags:["GM install","construction","result","founder freedom"] },
    { id:3, title:"Matt — Furniture Retail, GM install after failed sale", body:"Matt tried to sell his business but couldn't get the price he wanted. Heard BGB had a reputation for getting businesses to run without the owner. Was dubious about hiring a GM but willing to try. Went through GM Preparation, Upside Down Recruit — ended up promoting Ashlie internally. Onboarded her with the Peak Performance Onramp and runs the business using the Desert Island Dashboard. Result: 6 weeks after appointing Ashlie, Matt got in his caravan and drove around Australia with his family. Ashlie now runs the business and is a BGB member herself.", tags:["GM install","retail","result","internal promotion"] },
    { id:4, title:"Nick — Entertainment, 90% revenue growth, halved working hours", body:"Musician and performer. Joined BGB burnt out, hadn't taken a holiday since starting the business, not taking home much money. Had every excuse — 'no one else can do this as well as me.' Implemented the Weekly Rolling Cashflow Forecast to get control of finances. Step by Step Sales Process doubled his conversion rate. The Four Growth Levers grew the business 90% in 6 months. Daily Effectiveness Planner halved his working hours. Result: 'I have never been happier, healthier or wealthier. I have more time with the family and I am loving it.' Now takes regular holidays.", tags:["result","creative","cashflow","founder freedom"] },
    { id:5, title:"Magda & Kamen — Strata Management, record profits after culture reset", body:"Already had a successful business but were trapped inside it — constant team supervision, fixing problems, couldn't step away. Marketing was working but leads weren't converting. Used the Win/Kill Exercise to reset company culture — the team stepped up. Magda mastered the three disciplines of management (recruiting, developing, firing) — removed low performers and hired better. Implemented Step by Step Sales Process — led to record profit months. Result: Travel often, bought new cars, no longer work 5 days a week.", tags:["culture","sales","management","result"] },
  ],
  contrarian: [
    { id:1, title:"Hiring slow is a cope", body:"The 'hire slow, fire fast' advice exists because people won't trust their instincts. The right GM is obvious in 20 minutes if you know what you're hiring for.", tags:["hiring","hot take"] },
    { id:2, title:"Systems don't solve people problems", body:"One more system won't fix the chaos. Systems work when run by the right person. The problem is never the system — it's the absence of someone accountable for running it.", tags:["contrarian","core"] },
    { id:3, title:"The business shouldn't need your genius", body:"If your business only works because of your talent, you don't own a business. You own a job. A real business runs on process and people, not the founder's brilliance.", tags:["positioning","mindset"] },
  ],
  language: [
    { id:1, title:"Phrases Stephen actually uses", body:"'The business is a trap that relies on you.' / 'Install a GM.' / 'Owner lives a great life.' / 'That's the move.' / 'Do the maths.' / 'Lean into it.' / '$Xm ceiling.' / 'The right hire changes everything.'", tags:["voice"] },
    { id:2, title:"Things Stephen never says", body:"Never: 'leverage synergies', 'scale your brand', 'optimize workflow', 'crush it', 'hustle'. Direct and unimpressed by jargon.", tags:["voice","negative"] },
    { id:3, title:"Sentence structure patterns", body:"Short sentences. One idea per line on LinkedIn. Uses numbers specifically ($3.2M not 'a few million'). Ends with a 1-2 line punch. Never bullet lists in content — prose only.", tags:["format","voice"] },
  ],
  contentBank: [],
};

const SEED_WRITING_RULES = `NEVER DO THIS:
- Never use bullet points or numbered lists in post content
- Never use em dashes (—) as a stylistic crutch
- Never open with a question ("Have you ever...?", "What if I told you...?")
- Never use: leverage, synergies, game-changer, crush it, hustle, grind, unlock, skyrocket, double down, at the end of the day
- Never use motivational fluff or empty encouragement ("You've got this", "Believe in yourself")
- Never use passive voice ("It has been found that...", "Mistakes were made")
- Never end with a generic CTA ("Let me know in the comments", "Drop a like if you agree")
- Never use corporate jargon or consultant-speak
- Never write more than one idea per sentence on LinkedIn
- Never use more than 3 hashtags

ALWAYS DO THIS:
- Use specific numbers ($3.2M not "a few million", 90 days not "a few months")
- Short sentences. One idea per line on LinkedIn.
- Write in Stephen's direct, unimpressed voice — no hype
- End with a 1–2 line punch, not a question
- Reference real outcomes from real clients where possible
- Make the first line do all the work — it determines whether anyone reads on`;

const SEED_REVIEW = [];

const SEED_BESTPRACTICE = [
  { id:1, platform:"LinkedIn", category:"hook", title:"The Specific Failure Hook", pattern:"Open with a named, concrete failure the reader has already lived. No setup. No 'most people'. Just the exact moment they recognise.", example:"Your business grew because you were good at the work.\n\nNow you're trapped in the work because you're too good at it.", whyItWorks:"Specific failure creates instant recognition. The reader feels seen before you've sold anything. Stops the scroll because it sounds like their internal monologue.", source:"manual", addedDate:"2025-06-01" },
  { id:2, platform:"LinkedIn", category:"format", title:"One Idea Per Line, No Bullet Lists", pattern:"Each sentence stands alone on its own line. No bullet points, no numbered lists. Prose only. Maximum 2 sentences per paragraph block. Short paragraphs separated by a blank line.", example:"The fix isn't working harder. It's not another system.\n\nIt's a GM.", whyItWorks:"Short lines create white space that forces the reader to pause. Each line lands like a punctuation mark. Bullets signal 'content'. Prose signals 'person'.", source:"manual", addedDate:"2025-06-01" },
  { id:3, platform:"Both", category:"theme", title:"Proprietary Problem Naming", pattern:"Name the invisible constraint the owner is living inside. Give it a proper noun (The Founder Trap, The $5M Ceiling). Describe why it feels like success even as it limits them.", example:"I call it the Founder Trap.\n\nYou built the thing. You ARE the thing.", whyItWorks:"Naming a problem the reader hadn't articulated creates the feeling that you understand them better than they understand themselves. Proprietary names are memorable and shareable.", source:"manual", addedDate:"2025-06-02" },
  { id:4, platform:"LinkedIn", category:"engagement", title:"The Earned Contrarian Close", pattern:"End with a 1–2 line conclusion that contradicts the expected advice. The close must be earned by the logic of the post — not dropped in. No question. No CTA. Just the principle.", example:"The discomfort is the point. Lean into it.", whyItWorks:"Contrarian closes trigger comments from people who agree and disagree equally. Both camps share the post. The lack of a question makes it feel like a conviction, not a prompt.", source:"manual", addedDate:"2025-06-03" },
  { id:5, platform:"Instagram", category:"format", title:"Framework-as-Visual Prompt", pattern:"Name a framework in the first line. Give it a number (rungs, steps, phases). Describe each level in one sentence. End with where the reader is stuck right now.", example:"Draw your org chart.\n\nNow put your name everywhere it appears.\n\nThat's the problem.", whyItWorks:"Numbered frameworks are saved and shared because they feel like tools, not opinions. Instagram audiences respond to visual structure even in plain text. The final diagnosis triggers saves.", source:"manual", addedDate:"2025-06-04" },
];

// ─── AI ───────────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

async function callClaude(sys, user, maxTokens=2000) {
  if (!ANTHROPIC_KEY) throw new Error("No API key found. Add VITE_ANTHROPIC_KEY to your .env file.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, system:sys, messages:[{role:"user",content:user}] })
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  const raw=d.content.map(b=>b.text||"").join("");const match=raw.match(/\{[\s\S]*\}/);if(!match)throw new Error("No JSON found");return match[0];
}

function voiceCtx(mind, rules) {
  const cb = mind.contentBank?.filter(f=>f.summary);
  return `STEPHEN'S VOICE — SOURCE MATERIAL:
Use the frameworks, stories, language and content below as raw material. Draw on the concepts, proof points, and angles — apply your own intelligence to how they are expressed. Never copy these verbatim into posts.
Frameworks: ${mind.frameworks.map(f=>f.title+": "+f.body).join(" | ")}
Client stories: ${mind.clientStories.map(s=>s.title+": "+s.body).join(" | ")}
Contrarian takes: ${mind.contrarian.map(c=>c.title+": "+c.body).join(" | ")}
Language: ${mind.language.map(l=>l.body).join(" | ")}${cb?.length?`\nContent Bank:\n${cb.map(f=>{
    const detail = f.richSummary||f.summary;
    const frameworks = f.frameworks?.length ? " Frameworks: "+f.frameworks.join("; ") : "";
    const stories = f.stories?.length ? " Stories: "+f.stories.join("; ") : "";
    const stats = f.stats?.length ? " Stats: "+f.stats.join("; ") : "";
    const ideas = f.keyIdeas?.length ? " Key ideas: "+f.keyIdeas.join(", ") : "";
    return `[${f.title}] ${detail}${frameworks}${stories}${stats}${ideas}`;
  }).join("\n\n")}`:""}
${rules?`\nWRITING RULES — MUST FOLLOW:\n${rules}`:"NEVER: corporate jargon, bullet lists. Short sentences. Specific numbers. Direct."}`;
}

function fmtCtx(formats) {
  const p = formats.filter(f=>f.status==="proven");
  return p.length ? "PROVEN FORMATS: "+p.map(f=>`${f.name}: ${f.description}`).join(" | ") : "";
}

function bpCtx(bp) {
  if(!bp||bp.length===0) return "";
  const hooks=bp.filter(b=>b.category==="hook");
  const fmts=bp.filter(b=>b.category==="format");
  const themes=bp.filter(b=>b.category==="theme");
  const eng=bp.filter(b=>b.category==="engagement");
  const parts=[];
  if(hooks.length) parts.push("BEST PRACTICE HOOKS: "+hooks.map(b=>`${b.title}: ${b.pattern}`).join(" | "));
  if(fmts.length) parts.push("BEST PRACTICE FORMATS: "+fmts.map(b=>`${b.title}: ${b.pattern}`).join(" | "));
  if(themes.length) parts.push("BEST PRACTICE THEMES: "+themes.map(b=>`${b.title}: ${b.pattern}`).join(" | "));
  if(eng.length) parts.push("BEST PRACTICE ENGAGEMENT: "+eng.map(b=>`${b.title}: ${b.pattern}`).join(" | "));
  return parts.length?"INTERNET BEST PRACTICES (use to inform structure/hooks, always filtered through Stephen's voice):\n"+parts.join("\n"):"";
}

async function genPosts(raw, theme, fmt, mind, formats, bestPractice=[], writingRules="") {
  const raw2 = await callClaude(
    `You are a ghostwriter for Stephen at BGB Consulting. He helps $1M–$5M business owners install a GM and escape the founder trap.\n${voiceCtx(mind, writingRules)}\n${fmtCtx(formats)}\n${bpCtx(bestPractice)}\nIf no theme/format specified, pick the best ones from the knowledge banks.\nCTA RULE: Every variation MUST end with a CTA line pointing to bgb.coach/offer. Each variation must use a DIFFERENT CTA angle so we can test which converts best. Vary the wording — examples: "Get the full framework → bgb.coach/offer" / "See exactly how we fixed this → bgb.coach/offer" / "The BGB playbook behind this → bgb.coach/offer" / "If this sounds like your business → bgb.coach/offer". Include the CTA as the last line of content AND as a separate "cta" field.\nReturn ONLY a single line of valid JSON. No newlines anywhere in the JSON. Use \n for line breaks in content. Format: {"chosenTheme":"theme used","chosenFormat":"format used","insights":["insight1","insight2"],"variations":[{"platform":"LinkedIn","format":"fmt","hook":"hook","content":"line1\nline2\nline3\n\nCTA LINE","cta":"CTA LINE"},{"platform":"Instagram","format":"fmt","hook":"hook","content":"short post\n\nCTA LINE","cta":"CTA LINE"}],"suggestedABTest":{"hypothesis":"hyp","variantHook":"hook","variantContent":"content"}}`,
    `Raw input:\n${raw||"Pick the most compelling BGB topic right now based on the knowledge banks."}\n\nTheme: ${theme||"auto-pick best"}\nFormat: ${fmt||"auto-pick best"}`,
    3000
  );
  return JSON.parse(raw2);
}

async function genWeekPosts(mind, formats, writingRules="") {
  const raw = await callClaude(
    `You are a ghostwriter for Stephen at BGB Consulting. Generate 5 LinkedIn posts for this week — each on a DIFFERENT theme from Stephen's knowledge banks, each using the best-fit proven format. No two posts can share a theme or format. Maximise variety. Each post should stand alone and be ready to publish.\n${voiceCtx(mind, writingRules)}\n${fmtCtx(formats)}\nCTA RULE: Every post MUST end with a CTA line pointing to bgb.coach/offer. Each of the 5 posts must use a DIFFERENT CTA angle to test which converts best — vary the wording and tone. Include the CTA as the last line of content AND as a separate "cta" field.\nReturn ONLY valid JSON: {"posts":[{"theme":"...","format":"...","hook":"...","content":"full post text using \\n for line breaks\\n\\nCTA LINE","cta":"CTA LINE","platform":"LinkedIn","rationale":"one sentence why this theme+format combo now"}]}`,
    `Generate 5 varied LinkedIn posts for the week. Cover different angles of the BGB positioning — delegation, GM install, owner freedom, founder trap, scaling. Mix proven and testing formats.`,
    4000
  );
  return JSON.parse(raw);
}

async function analysePost(post, mind, formats) {
  const raw = await callClaude(
    `You are the BGB Content Intelligence agent. Analyse post performance after 7 days.\n${voiceCtx(mind)}\nReturn ONLY valid JSON: {"score":0-100,"verdict":"promote_to_proven"|"continue_testing"|"retire","reasoning":"2-3 sentences","formatInsight":"...","nextAction":"...","suggestProven":true|false}. Score based on: doc views per 1000 impressions (primary), calls (secondary), engagement (tertiary).`,
    `Post: ${JSON.stringify({title:post.title,platform:post.platform,theme:post.theme,format:post.format,impressions:post.impressions,docViews:post.docViews,calls:post.calls,engagement:post.engagement,daysLive:post.daysLive})}`
  );
  return JSON.parse(raw);
}

async function genABTest(format, mind) {
  const raw = await callClaude(
    `You are the BGB Content Intelligence agent. Generate an A/B test.\n${voiceCtx(mind)}\nReturn ONLY valid JSON: {"hypothesis":"If we [change X], then [doc views] will [change] because [reason]","variantChange":"exactly what differs","variantA":{"hook":"...","content":"..."},"variantB":{"hook":"...","content":"..."}}`,
    `Generate A/B test for format: "${format.name}" — ${format.description}. Theme: Delegation Ladder / GM Install.`
  );
  return JSON.parse(raw);
}

async function genReport(posts, formats, mind) {
  const raw = await callClaude(
    `You are the BGB Content Intelligence agent. Generate a weekly self-optimisation report.\nReturn ONLY valid JSON: {"headline":"...","topFormat":"...","topTheme":"...","docViewsPerImpression":"X.X per 1000","insights":[{"type":"win|learn|test|next","title":"...","detail":"..."}],"formatsToPromote":["..."],"nextTests":["..."],"contentQueue":["...","...","..."]}`,
    `Posts: ${JSON.stringify(posts.map(p=>({title:p.title,theme:p.theme,format:p.format,platform:p.platform,impressions:p.impressions,docViews:p.docViews,calls:p.calls})))}\nFormats: ${JSON.stringify(formats)}`,
    3000
  );
  return JSON.parse(raw);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function CopyBtn({ text, label="Copy" }) {
  const [done,setDone] = useState(false);
  return <button className="btn bo bsm" onClick={()=>{navigator.clipboard.writeText(text);setDone(true);setTimeout(()=>setDone(false),1800)}}>{done?"✓ Copied":label}</button>;
}

function Score({ v }) {
  const col = v>=70?"var(--sage)":v>=45?"var(--gold)":"var(--rust)";
  return <div className="sb2"><div className="st"><div className="sf" style={{width:`${v}%`,background:col}}/></div><span className="xs" style={{color:col,minWidth:26}}>{v}</span></div>;
}

function PostRow({ post, analysis }) {
  const verdictCol={strong:"ts",average:"tg",weak:"tr"};
  const typeCol={video:"tv",image:"tb",document:"tprov",carousel:"tg",text:"ti"};
  const pa = analysis?.postAnalyses?.find(a=>a.id===post.id) || (post.verdict?post:null);
  return (
    <div className="li">
      <div className="libody">
        <div className="f fac g8 mb6">
          <span className={`tag ${typeCol[post.postType]||"ti"}`}>{post.postType||"text"}</span>
          {pa&&<span className={`tag ${verdictCol[pa.verdict]||"ti"}`}>{pa.verdict}</span>}
          {pa?.matchedPattern&&<span className="tag tprov">↔ {pa.matchedPattern}</span>}
          {pa?.hookScore!=null&&<span className="xs muted">Hook {pa.hookScore}/100</span>}
          {pa?.saveSignal&&pa.saveSignal!=="low"&&<span className={`tag ${pa.saveSignal==="high"?"ts":"tg"}`}>{pa.saveSignal} saves</span>}
        </div>
        <div className="lititle">{post.hook||"(no hook)"}</div>
        {post.text&&post.text!==post.hook&&<div className="liprev">{post.text}</div>}
        <div className="limetrics mt6">
          <span className="mp"><strong>{(post.impressions||0).toLocaleString()}</strong> imp</span>
          {post.reach>0&&<span className="mp"><strong>{post.reach.toLocaleString()}</strong> reach</span>}
          {post.saves>0&&<span className="mp hl"><strong>{post.saves}</strong> saves</span>}
          <span className="mp"><strong>{post.reactions||0}</strong> likes</span>
          <span className="mp"><strong>{post.comments||0}</strong> comments</span>
          {post.reposts>0&&<span className="mp"><strong>{post.reposts}</strong> reposts</span>}
          {post.clicks>0&&<span className="mp hl"><strong>{post.clicks}</strong> clicks</span>}
          {post.engagementRate&&<span className="mp"><strong>{post.engagementRate}%</strong> eng</span>}
        </div>
        {pa&&<div className="rp mt8"><div className="sm mb4">{pa.whyWorked}</div><div className="xs" style={{color:"var(--violet)"}}>→ {pa.recommendation}</div></div>}
        {post.url&&<div className="mt8"><a href={post.url} target="_blank" rel="noreferrer" className="btn bo bsm">View post ↗</a></div>}
      </div>
    </div>
  );
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
function Dashboard({ posts, formats, reviewQueue, contentQueue, setPage, postFromQueue }) {
  const pub = posts.filter(p=>p.status==="published");
  const totalDV = pub.reduce((s,p)=>s+p.docViews,0);
  const totalCalls = pub.reduce((s,p)=>s+p.calls,0);
  const totalImp = pub.reduce((s,p)=>s+p.impressions,0);
  const dvRate = totalImp>0?((totalDV/totalImp)*1000).toFixed(1):0;
  const proven = formats.filter(f=>f.status==="proven").length;
  const testing = formats.filter(f=>f.status==="testing").length;
  const pending = reviewQueue.filter(r=>r.status==="ready").length;
  const topPost = [...pub].sort((a,b)=>b.docViews-a.docViews)[0];
  const queue = contentQueue||[];
  return (
    <div>
      <div className="alert ag mb20 f fac g8">
        <span className="pulse"/><span><strong>Agent active.</strong> {pending} post{pending!==1?"s":""} ready for 7-day review · {proven} proven formats · {testing} in test</span>
        {pending>0&&<button className="btn bg bsm mla" onClick={()=>setPage("review")}>Review now →</button>}
      </div>
      {queue.length>0&&(
        <div className="card mb16" style={{borderColor:"rgba(201,168,76,0.4)"}}>
          <div className="ct">▦ Content Queue <span className="xs muted" style={{fontWeight:400,marginLeft:4}}>— {queue.length} post{queue.length!==1?"s":""} ready</span>
            <div className="cta"><button className="btn bo bsm" onClick={()=>setPage("queue")}>View all →</button><button className="btn bp bsm" onClick={()=>setPage("generate")}>+ Generate</button></div>
          </div>
          {queue.slice(0,3).map(item=>(
            <div key={item.id} className="li">
              <div className="libody">
                <div className="f fac g8 mb4"><span className="tag tb">{item.platform}</span>{item.theme&&<span className="tag tg">{item.theme}</span>}{item.format&&<span className="tag ti">{item.format}</span>}</div>
                <div className="lititle">{item.hook||item.content.split('\n')[0].slice(0,70)}</div>
                <div className="f g8 mt8"><button className="btn bg bsm" onClick={()=>postFromQueue&&postFromQueue(item)}>Copy & Post →</button></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="g4 mb20">
        <div className="sc gold"><div className="sl">Doc Views</div><div className="sv">{totalDV}</div><div className="ss">offer doc opens</div></div>
        <div className="sc rust"><div className="sl">Calls Booked</div><div className="sv">{totalCalls}</div><div className="ss">of 5 target</div></div>
        <div className="sc sage"><div className="sl">DV / 1k Imp</div><div className="sv">{dvRate}</div><div className="ss">conversion signal</div></div>
        <div className="sc violet"><div className="sl">Proven Formats</div><div className="sv">{proven}</div><div className="ss">{testing} in testing</div></div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="ct">🏆 Top Post (Doc Views)</div>
          {topPost?(<>
            <div className="f fac g8 mb8"><span className="tag tb">{topPost.platform}</span><span className="tag tg">{topPost.theme}</span>{topPost.proven&&<span className="tag tprov">Proven</span>}</div>
            <div style={{fontWeight:600,marginBottom:8}}>{topPost.title}</div>
            <div className="f g12"><span className="mp"><strong>{topPost.impressions.toLocaleString()}</strong> imp</span><span className="mp hl"><strong>{topPost.docViews}</strong> doc views</span><span className="mp"><strong>{topPost.calls}</strong> calls</span></div>
          </>):<div className="muted sm">No posts yet.</div>}
        </div>
        <div className="card">
          <div className="ct">⚗️ Active A/B Tests</div>
          {formats.filter(f=>f.status==="testing").length===0&&<div className="muted sm">No active tests.</div>}
          {formats.filter(f=>f.status==="testing").map(f=>(
            <div key={f.id} className="li">
              <div className="libody">
                <div className="f fac g8 mb4"><span className="tag ttest">TESTING</span></div>
                <div className="lititle">{f.name}</div>
                <div className="liprev">{f.description}</div>
                <div className="limetrics mt8"><span className="mp"><strong>{f.postsUsed}</strong> posts</span><span className="mp hl"><strong>{f.avgDocViews.toFixed(0)}</strong> avg doc views</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="ct">🔄 Content Loop <span className="mla xs muted">primary signal: offer doc views</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",textAlign:"center"}}>
          {[["✦","Capture","Raw thinking → Library"],["⊕","Generate","Mind + Proven formats → Post"],["↑","Publish","Manual post + tracked link"],["◉","Track","Doc views, calls, impressions"],["◐","Review","7-day analysis → promote/retire"]].map(([ic,t,s],i)=>(
            <div key={i} style={{padding:"14px 6px",borderRight:i<4?"1px solid var(--border)":"none"}}>
              <div style={{fontSize:20,marginBottom:5}}>{ic}</div>
              <div style={{fontWeight:600,fontSize:12,marginBottom:3}}>{t}</div>
              <div style={{fontSize:10,color:"var(--ink60)",lineHeight:1.5}}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function extractPDF(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error("PDF.js not loaded — please refresh and try again.");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: buffer}).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return text;
}

async function extractDOCX(file) {
  const mammoth = window.mammoth;
  if (!mammoth) throw new Error("Mammoth.js not loaded — please refresh and try again.");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({arrayBuffer: buffer});
  return result.value;
}

function MyMind({ mind, setMind }) {
  const [tab,setTab] = useState("frameworks");
  const [form,setForm] = useState({title:"",body:"",tags:""});
  const [saved,setSaved] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [uploadStage,setUploadStage] = useState("");
  const [uploadErr,setUploadErr] = useState("");

  const cats = [
    {key:"frameworks",label:"Frameworks",icon:"🧠",col:"var(--gold)"},
    {key:"clientStories",label:"Client Stories",icon:"🤝",col:"var(--sage)"},
    {key:"contrarian",label:"Contrarian Takes",icon:"⚡",col:"var(--rust)"},
    {key:"language",label:"Language Patterns",icon:"✍️",col:"var(--violet)"},
  ];

  const add = () => {
    if(!form.title||!form.body) return;
    setMind(m=>({...m,[tab]:[...m[tab],{id:Date.now(),title:form.title,body:form.body,tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean)}]}));
    setForm({title:"",body:"",tags:""}); setSaved(true); setTimeout(()=>setSaved(false),1800);
  };
  const del = (key,id) => setMind(m=>({...m,[key]:m[key].filter(e=>e.id!==id)}));
  const delContent = (id) => setMind(m=>({...m,contentBank:(m.contentBank||[]).filter(f=>f.id!==id)}));

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadErr(""); setUploadStage("Extracting text from file...");
    try {
      let text = "";
      if (file.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPDF(file);
      } else if (file.name.toLowerCase().endsWith(".docx")) {
        text = await extractDOCX(file);
      } else {
        throw new Error("Only PDF and DOCX files are supported.");
      }
      if (!text.trim()) throw new Error("No text could be extracted from this file.");
      const truncated = text.slice(0, 40000);
      setUploadStage("Claude is reading and building a full content summary (~1 min)...");
      const raw = await callClaude(
        `You are a senior content strategist extracting material from a business document to fuel LinkedIn content creation. Produce a COMPREHENSIVE, DETAILED extraction — aim for approximately 1000 words across all fields combined. Return ONLY valid JSON with this exact structure:
{
  "title": "short descriptive title (max 8 words)",
  "summary": "2-3 sentence high-level overview for injection into AI prompts",
  "richSummary": "COMPREHENSIVE 600-900 word deep-dive. Cover: the core thesis and big ideas, each major framework or methodology with enough detail to actually use it, specific stories or case studies mentioned, key statistics or proof points, the author's philosophy and worldview, and practical applications. Write in flowing paragraphs, not bullet points. Be thorough — this is the reference document Claude will draw on when writing posts.",
  "keyIdeas": ["specific actionable idea with enough context to be useful — aim for 12-15 ideas", "..."],
  "frameworks": ["Framework Name: detailed description of how it works and when to apply it", "..."],
  "language": ["specific phrase or term used in this document", "..."],
  "stories": ["story/case study name: brief description of what happened and the result", "..."],
  "stats": ["specific number or statistic from the document with its context", "..."]
}`,
        `Document content:\n\n${truncated}`,
        4000
      );
      const data = JSON.parse(raw);
      const entry = {
        id: Date.now(),
        filename: file.name,
        title: data.title || file.name,
        summary: data.summary || "",
        richSummary: data.richSummary || data.summary || "",
        keyIdeas: data.keyIdeas || [],
        frameworks: data.frameworks || [],
        language: data.language || [],
        stories: data.stories || [],
        stats: data.stats || [],
        uploadedAt: new Date().toISOString(),
      };
      setMind(m=>({...m, contentBank: [...(m.contentBank||[]), entry]}));
    } catch(err) {
      setUploadErr("Upload failed: " + err.message);
    } finally {
      setUploading(false); setUploadStage("");
      e.target.value = "";
    }
  };

  const isContentBank = tab === "contentBank";
  const ac = cats.find(c=>c.key===tab);

  return (
    <div>
      <div className="alert av mb20"><strong>Your Mind Bank</strong> — everything here is injected into every AI generation call as source material. Claude draws on the ideas and frameworks intelligently — it never copies them word for word.</div>
      <div className="g2">
        <div>
          <div className="tabs">
            {cats.map(c=><div key={c.key} className={`tab ${tab===c.key?"active":""}`} onClick={()=>setTab(c.key)}>{c.icon} {c.label}</div>)}
            <div className={`tab ${isContentBank?"active":""}`} onClick={()=>setTab("contentBank")}>📁 Content Bank</div>
          </div>

          {isContentBank ? (
            <div className="card">
              <div className="ct">📁 Upload to Content Bank</div>
              <div className="xs muted mb14">Upload ebooks, frameworks, or process docs. Claude reads the document once, extracts the key ideas, and injects them into every generation call.</div>
              <label style={{display:"block",border:"2px dashed var(--border)",borderRadius:2,padding:"28px 16px",textAlign:"center",cursor:uploading?"not-allowed":"pointer",background:"var(--paper)",opacity:uploading?0.6:1}}>
                <div style={{fontSize:28,marginBottom:6}}>⬆</div>
                <div style={{fontSize:13,fontWeight:500}}>Click to upload PDF or Word doc</div>
                <div className="xs muted mt4">PDF or DOCX — text extracted in-browser, ideas summarised by Claude</div>
                <input type="file" accept=".pdf,.docx" style={{display:"none"}} disabled={uploading} onChange={handleFileUpload}/>
              </label>
              {uploading&&<div className="alert av mt12"><span className="spin"/> {uploadStage}</div>}
              {uploadErr&&<div className="alert ar mt10">{uploadErr}</div>}
            </div>
          ) : (
            <div className="card">
              <div className="ct"><span>{ac.icon}</span> Add to {ac.label}</div>
              <div className="fg"><label className="lbl">Title</label><input className="inp" placeholder="Name this entry..." value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
              <div className="fg"><label className="lbl">Content</label><textarea className="ta" style={{minHeight:130}} placeholder="Describe the idea, framework, or story. Claude will draw on the concept intelligently — not copy the words." value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}/></div>
              <div className="fg"><label className="lbl">Tags</label><input className="inp" placeholder="core, hiring, mindset..." value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}/></div>
              <button className={`btn w100 ${saved?"bsa":"bp"}`} onClick={add}>{saved?"✓ Added to Your Mind":`Add to ${ac.label} →`}</button>
            </div>
          )}
        </div>

        {isContentBank ? (
          <div className="card" style={{maxHeight:680,overflowY:"auto"}}>
            <div className="mct" style={{color:"var(--ink)"}}>📁 Content Bank</div>
            {(mind.contentBank||[]).length===0&&<div className="muted sm">No files uploaded yet. Upload a PDF or DOCX and Claude will extract the key ideas automatically.</div>}
            {(mind.contentBank||[]).map(f=>(
              <div key={f.id} className="me">
                <div className="f fac g8 mb4">
                  <div className="met">{f.title}</div>
                  <button className="btn bgh bsm mla" style={{color:"var(--rust)",fontSize:10}} onClick={()=>delContent(f.id)}>Remove</button>
                </div>
                <div className="xs muted mb6" style={{fontFamily:"DM Mono,monospace",fontSize:10}}>{f.filename}</div>
                {(f.richSummary||f.summary)&&<div className="meb mb8" style={{whiteSpace:"pre-wrap",lineHeight:1.6}}>{f.richSummary||f.summary}</div>}
                {f.stats?.length>0&&(
                  <div className="mb8">
                    <div className="xs" style={{fontWeight:600,marginBottom:4,color:"var(--ink)"}}>Key Stats</div>
                    {f.stats.map((s,i)=><div key={i} className="xs muted" style={{marginBottom:2}}>• {s}</div>)}
                  </div>
                )}
                {f.stories?.length>0&&(
                  <div className="mb8">
                    <div className="xs" style={{fontWeight:600,marginBottom:4,color:"var(--ink)"}}>Stories & Case Studies</div>
                    {f.stories.map((s,i)=><div key={i} className="xs muted" style={{marginBottom:2}}>• {s}</div>)}
                  </div>
                )}
                {f.frameworks?.length>0&&(
                  <div className="mb8">
                    <div className="xs" style={{fontWeight:600,marginBottom:4,color:"var(--ink)"}}>Frameworks</div>
                    {f.frameworks.map((fw,i)=><div key={i} className="xs muted" style={{marginBottom:2}}>• {fw}</div>)}
                  </div>
                )}
                {f.keyIdeas?.length>0&&(
                  <div className="mb8">
                    <div className="xs" style={{fontWeight:600,marginBottom:4,color:"var(--ink)"}}>Key Ideas</div>
                    <div className="f g4x fw">{f.keyIdeas.map(k=><span key={k} className="tag ti">{k}</span>)}</div>
                  </div>
                )}
                {f.language?.length>0&&(
                  <div>
                    <div className="xs" style={{fontWeight:600,marginBottom:4,color:"var(--ink)"}}>Language</div>
                    <div className="f g4x fw">{f.language.map(l=><span key={l} className="tag" style={{background:"var(--paper)",border:"1px solid var(--border)",color:"var(--muted)"}}>{l}</span>)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{maxHeight:680,overflowY:"auto"}}>
            {cats.map(cat=>(
              <div key={cat.key} className="mc">
                <div className="mct" style={{color:cat.col}}>{cat.icon} {cat.label}</div>
                {mind[cat.key].length===0&&<div className="muted sm">None yet.</div>}
                {mind[cat.key].map(e=>(
                  <div key={e.id} className="me">
                    <div className="f fac g8 mb4"><div className="met">{e.title}</div><button className="btn bgh bsm mla" style={{color:"var(--rust)",fontSize:10}} onClick={()=>del(cat.key,e.id)}>Remove</button></div>
                    <div className="meb">{e.body}</div>
                    {e.tags?.length>0&&<div className="f g4x fw mt8">{e.tags.map(t=><span key={t} className="tag ti">{t}</span>)}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WhatWorksBank({ formats, setFormats, mind }) {
  const [tab,setTab] = useState("proven");
  const [loading,setLoading] = useState(false);
  const [abResult,setAbResult] = useState(null);
  const [abFormat,setAbFormat] = useState(null);
  const [err,setErr] = useState("");
  const proven = formats.filter(f=>f.status==="proven");
  const testing = formats.filter(f=>f.status==="testing");
  const proposed = formats.filter(f=>f.status==="proposed");
  const promote = id => setFormats(prev=>prev.map(f=>f.id===id?{...f,status:f.status==="testing"?"proven":"testing"}:f));
  const retire = id => setFormats(prev=>prev.filter(f=>f.id!==id));
  const runAB = async fmt => {
    setLoading(true); setErr(""); setAbFormat(fmt); setAbResult(null);
    try { const r=await genABTest(fmt,mind); setAbResult(r); setTab("ab"); }
    catch(e){ setErr("A/B failed: "+e.message); }
    finally { setLoading(false); }
  };
  const addFmt = () => {
    const name=prompt("Format name?"); if(!name) return;
    const desc=prompt("Describe this format:"); if(!desc) return;
    setFormats(p=>[...p,{id:Date.now(),name,description:desc,status:"testing",avgDocViews:0,avgCalls:0,postsUsed:0,notes:""}]);
  };
  const scMap = {proven:"tprov",testing:"ttest",proposed:"ti"};
  const FC = ({f}) => (
    <div className={`fc ${f.status}`}>
      <div className="fcbadge"><span className={`tag ${scMap[f.status]}`}>{f.status.toUpperCase()}</span></div>
      <div className="fcname">{f.name}</div>
      <div className="fcdesc">{f.description}</div>
      {f.example&&<div className="xs muted mb8" style={{fontStyle:"italic"}}>"{f.example}"</div>}
      {f.postsUsed>0&&<div className="fcstats mb10"><div className="fcs"><strong>{f.avgDocViews.toFixed(1)}</strong>avg doc views</div><div className="fcs"><strong>{f.avgCalls.toFixed(1)}</strong>avg calls</div><div className="fcs"><strong>{f.postsUsed}</strong>posts</div></div>}
      {f.notes&&<div className="xs muted mb10">{f.notes}</div>}
      <div className="f g8 fw">
        {f.status==="testing"&&<button className="btn bg bsm" onClick={()=>promote(f.id)}>Promote to Proven ✓</button>}
        {f.status==="proven"&&<button className="btn bo bsm" onClick={()=>promote(f.id)}>Move to Testing</button>}
        {f.status!=="proven"&&<button className="btn bv bsm" onClick={()=>runAB(f)} disabled={loading}>{loading&&abFormat?.id===f.id?<><span className="spin"/> Running...</>:"Run A/B Test"}</button>}
        {f.status==="proposed"&&<button className="btn bsa bsm" onClick={()=>promote(f.id)}>Start Testing →</button>}
        <button className="btn bgh bsm" style={{color:"var(--rust)"}} onClick={()=>retire(f.id)}>Retire</button>
      </div>
    </div>
  );
  return (
    <div>
      <div className="alert ag mb20"><strong>What Works Bank</strong> — only formats confirmed to drive offer doc views enter Proven. The agent uses Proven formats by default and runs tests alongside them.</div>
      {err&&<div className="alert ar">{err}</div>}
      <div className="f fac fjb mb16">
        <div className="tabs" style={{marginBottom:0,borderBottom:"none"}}>
          {[["proven",`Proven (${proven.length})`],["testing",`Testing (${testing.length})`],["proposed",`Proposed (${proposed.length})`],["ab","A/B Lab"]].map(([k,l])=>(
            <div key={k} className={`tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</div>
          ))}
        </div>
        <button className="btn bo bsm" onClick={addFmt}>+ Add Format</button>
      </div>
      <div style={{borderTop:"1px solid var(--border)",paddingTop:18}}>
        {tab==="proven"&&(proven.length===0?<div className="es"><div className="esi">🏆</div><p>No proven formats yet.</p></div>:proven.map(f=><FC key={f.id} f={f}/>))}
        {tab==="testing"&&(testing.length===0?<div className="es"><div className="esi">⚗️</div><p>No active tests.</p></div>:testing.map(f=><FC key={f.id} f={f}/>))}
        {tab==="proposed"&&(proposed.length===0?<div className="es"><div className="esi">💡</div><p>Proposed formats appear here after weekly report.</p></div>:proposed.map(f=><FC key={f.id} f={f}/>))}
        {tab==="ab"&&(abResult?(
          <div className="card">
            <div className="ct">🧪 A/B Test — {abFormat?.name}</div>
            <div className="alert av mb16"><strong>Hypothesis:</strong> {abResult.hypothesis}</div>
            <div className="xs muted mb12">What changes: {abResult.variantChange}</div>
            <div className="abr">
              <div className="abc"><div className="abl">Variant A — Control</div><div style={{fontWeight:600,marginBottom:6}}>{abResult.variantA?.hook}</div><div className="abt">{abResult.variantA?.content}</div></div>
              <div className="abc"><div className="abl">Variant B — Test</div><div style={{fontWeight:600,marginBottom:6}}>{abResult.variantB?.hook}</div><div className="abt">{abResult.variantB?.content}</div></div>
            </div>
            <div className="f g8 mt12"><CopyBtn text={abResult.variantA?.content} label="Copy A"/><CopyBtn text={abResult.variantB?.content} label="Copy B"/><div className="mla xs muted">Measure: doc views after 7 days</div></div>
          </div>
        ):<div className="es"><div className="esi">⚗️</div><p>Select a format and click "Run A/B Test".</p></div>)}
      </div>
    </div>
  );
}

function ReviewQueue({ posts, setPosts, formats, setFormats, reviewQueue, setReviewQueue, mind }) {
  const [analyses,setAnalyses] = useState({});
  const [loading,setLoading] = useState({});
  const [err,setErr] = useState("");
  const pending = reviewQueue.filter(r=>r.status==="ready");
  const runAnalysis = async item => {
    const post = posts.find(p=>p.id===item.postId); if(!post) return;
    setLoading(l=>({...l,[item.id]:true}));
    try {
      const r = await analysePost(post,mind,formats);
      setAnalyses(a=>({...a,[item.id]:r}));
      setReviewQueue(q=>q.map(r2=>r2.id===item.id?{...r2,aiProposal:r}:r2));
    } catch(e){setErr("Analysis failed: "+e.message);}
    finally{setLoading(l=>({...l,[item.id]:false}));}
  };
  const approve = (item,analysis) => {
    const post = posts.find(p=>p.id===item.postId);
    if(analysis.verdict==="promote_to_proven"){
      setPosts(prev=>prev.map(p=>p.id===item.postId?{...p,proven:true,reviewedAt:new Date().toISOString().slice(0,10)}:p));
      if(post?.format) setFormats(prev=>prev.map(f=>f.name===post.format?{...f,status:"proven"}:f));
    }
    setReviewQueue(q=>q.map(r=>r.id===item.id?{...r,status:"approved"}:r));
  };
  const dismiss = item => setReviewQueue(q=>q.map(r=>r.id===item.id?{...r,status:"dismissed"}:r));
  const vCol = {promote_to_proven:"ts",continue_testing:"tg",retire:"tr"};
  return (
    <div>
      <div className="alert av mb20"><strong>7-Day Review Queue</strong> — the agent analyses each post after 7 days. You confirm or override. Approved patterns update the What Works Bank.</div>
      {err&&<div className="alert ar">{err}</div>}
      {pending.length===0&&<div className="es card"><div className="esi">✅</div><p>No posts pending review.</p></div>}
      {pending.map(item=>{
        const analysis = analyses[item.id]||item.aiProposal;
        return (
          <div key={item.id} className="card">
            <div className="f fac g8 mb12">
              <span className="rdot"/><div style={{fontWeight:600,fontSize:14}}>{item.postTitle}</div>
              <div className="mla f g8"><span className="tag tb">{item.platform}</span>{item.testGroup&&<span className="tag tv">Test {item.testGroup}</span>}<span className="xs muted">Due {item.dueDate}</span></div>
            </div>
            <div className="g4 mb16">
              <div><div className="sl">Doc Views</div><div className="serif" style={{fontSize:24,fontWeight:700,color:"var(--gold)"}}>{item.docViews}</div></div>
              <div><div className="sl">Calls</div><div className="serif" style={{fontSize:24,fontWeight:700}}>{item.calls}</div></div>
              <div><div className="sl">Impressions</div><div className="serif" style={{fontSize:24,fontWeight:700}}>{item.impressions.toLocaleString()}</div></div>
              <div><div className="sl">Format</div><div className="sm" style={{paddingTop:4,fontWeight:500}}>{item.format||"—"}</div></div>
            </div>
            {!analysis&&<button className="btn bp" onClick={()=>runAnalysis(item)} disabled={loading[item.id]}>{loading[item.id]?<><span className="spin"/> Analysing...</>:"Run Agent Analysis →"}</button>}
            {analysis&&(
              <div className="rp">
                <div className="f fac g8 mb10">
                  <span className={`tag ${vCol[analysis.verdict]||"ti"}`}>{analysis.verdict?.replace(/_/g," ").toUpperCase()}</span>
                  <div className="mla"><Score v={analysis.score}/></div>
                </div>
                <div className="sm mb8"><strong>Reasoning:</strong> {analysis.reasoning}</div>
                <div className="xs muted mb8">{analysis.formatInsight}</div>
                <div className="xs mb14" style={{color:"var(--violet)"}}>→ {analysis.nextAction}</div>
                <div className="f g8">
                  <button className="btn bsa bsm" onClick={()=>approve(item,analysis)}>{analysis.verdict==="promote_to_proven"?"✓ Approve & Promote":"✓ Confirm & File"}</button>
                  <button className="btn bo bsm" onClick={()=>dismiss(item)}>Override / Dismiss</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {reviewQueue.filter(r=>r.status!=="ready").length>0&&(
        <div className="card">
          <div className="ct">📁 Completed Reviews</div>
          <table>
            <thead><tr><th>Post</th><th>Verdict</th><th>Doc Views</th><th>Status</th></tr></thead>
            <tbody>{reviewQueue.filter(r=>r.status!=="ready").map(r=>(
              <tr key={r.id}>
                <td style={{fontWeight:500}}>{r.postTitle}</td>
                <td>{r.aiProposal?<span className={`tag ${vCol[r.aiProposal.verdict]||"ti"}`}>{r.aiProposal.verdict?.replace(/_/g," ")}</span>:"—"}</td>
                <td>{r.docViews}</td>
                <td><span className={`tag ${r.status==="approved"?"ts":"ti"}`}>{r.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ContentEngine({ assets, posts, setPosts, formats, mind, setPage, engineState, setEngineState, bestPractice=[] }) {
  const [step,setStep] = useState(0);
  const [raw,setRaw] = useState(""); const [theme,setTheme] = useState("Delegation Ladder"); const [fmt,setFmt] = useState("");
  const [loading,setLoading] = useState(false); const [err,setErr] = useState(""); const [result,setResult] = useState(null);
  const [sel,setSel] = useState(null); const [edited,setEdited] = useState(""); const [ptitle,setPtitle] = useState("");
  const [isTest,setIsTest] = useState(false);
  const proven = formats.filter(f=>f.status==="proven");
  const generate = async () => {
    if(!raw.trim()) return;
    setLoading(true); setErr(""); setStep(1);
    try { const r=await genPosts(raw,theme,fmt,mind,formats,bestPractice); setResult(r); setStep(2); }
    catch(e){setErr("Generation failed: "+e.message);setStep(0);}
    finally{setLoading(false);}
  };
  const pickAB = () => { if(!result?.suggestedABTest) return; const v=result.suggestedABTest; setSel({platform:"LinkedIn",format:"A/B Variant",hook:v.variantHook,content:v.variantContent}); setEdited(v.variantContent); setPtitle(v.variantHook||v.variantContent.slice(0,60)); setIsTest(true); setStep(3); };
  const pick = v => { setSel(v); setEdited(v.content); setPtitle(v.hook||v.content.split("\n")[0].slice(0,60)); setStep(3); };
  const approve = () => {
    const usedFmt = sel?.format||fmt||"Unknown";
    setPosts(prev=>[...prev,{
      id:Date.now(), title:ptitle, content:edited,
      platform:(sel?.platform?.replace(" (contrarian)","") || "LinkedIn"),
      theme, format:usedFmt,
      date:new Date().toISOString().slice(0,10),
      status:"approved",
      trackedLink:`bgb.co/p${Date.now().toString().slice(-4)}`,
      impressions:0, engagement:0, docViews:0, calls:0, url:"",
      isTest, testGroup:isTest?"A":null, proven:false, daysLive:0
    }]);
    setStep(0); setRaw(""); setResult(null); setSel(null); setIsTest(false);
    setPage("publish");
  };
  return (
    <div>
      {proven.length>0&&<div className="alert ag mb20"><strong>{proven.length} proven format{proven.length>1?"s":""} active:</strong> {proven.map(f=>f.name).join(", ")} — AI defaults to these.</div>}
      <div className="pipe">{["Input","Insights","Variations","Approve"].map((s,i)=><div key={s} className={`ps ${step===i?"active":""}`} onClick={()=>step>i&&setStep(i)}><span className="psn">{i+1}</span>{s}</div>)}</div>
      {err&&<div className="alert ar">{err}</div>}
      {step===0&&(
        <div className="card">
          <div className="ct">💡 Raw Input</div>
          <div className="g2">
            <div className="fg"><label className="lbl">Theme</label>
              <select className="sel" value={theme} onChange={e=>setTheme(e.target.value)}>
                {["Delegation Ladder","GM Install","Owner Freedom","Business as Trap","Hiring & Team","Systems & Processes"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="fg"><label className="lbl">Format (or let AI choose)</label>
              <select className="sel" value={fmt} onChange={e=>setFmt(e.target.value)}>
                <option value="">AI chooses best format</option>
                {formats.map(f=><option key={f.id} value={f.name}>{f.status==="proven"?"✓ ":f.status==="testing"?"⚗ ":"· "}{f.name}</option>)}
              </select>
            </div>
          </div>
          <div className="fg"><label className="lbl">Raw thinking</label>
            <textarea className="ta" style={{minHeight:200}} placeholder="Client story, rant, framework idea, call transcript. The messier the better." value={raw} onChange={e=>setRaw(e.target.value)}/>
          </div>
          <div className="f fac g12">
            <button className="btn bp" onClick={generate} disabled={!raw.trim()||loading}>{loading?<><span className="spin"/> Generating...</>:"Generate Posts →"}</button>
            {assets.length>0&&<select className="sel" style={{maxWidth:230}} onChange={e=>{const a=assets.find(a=>String(a.id)===e.target.value);if(a)setRaw(a.content||a.summary||"");}}>
              <option value="">← Load from library</option>
              {assets.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
            </select>}
          </div>
        </div>
      )}
      {step===1&&loading&&<div className="card" style={{textAlign:"center",padding:56}}><div style={{fontSize:34,marginBottom:12}}>🧠</div><div className="serif" style={{fontSize:19,marginBottom:6}}>Writing in Stephen's voice...</div><div className="muted sm">Applying Your Mind · Using proven formats · Extracting commercial insight</div></div>}
      {step>=2&&result&&(
        <>
          <div className="card mb16">
            <div className="ct">🔍 Extracted Insights</div>
            {result.insights?.map((ins,i)=><div key={i} className="li"><div style={{paddingTop:2,color:"var(--gold)",fontWeight:700}}>→</div><div className="libody"><div className="sm">{ins}</div></div></div>)}
          </div>
          {step===2&&(
            <>
              <div className="card mb16">
                <div className="ct">✍️ Variations — select the strongest</div>
                {result.variations?.map((v,i)=>(
                  <div key={i} className={`vc ${sel===v?"sel":""}`} onClick={()=>pick(v)}>
                    <div className="f fac g8 mb8"><div className="vp">{v.platform}</div>{v.format&&<span className="tag ti">{v.format}</span>}</div>
                    <div className="vt">{v.content}</div>
                    <div className="f g8 mt10"><button className="btn bg bsm" onClick={e=>{e.stopPropagation();pick(v);}}>Select →</button><CopyBtn text={v.content}/></div>
                  </div>
                ))}
              </div>
              {result.suggestedABTest&&(
                <div className="card" style={{borderColor:"rgba(92,75,138,0.35)"}}>
                  <div className="ct">⚗️ Agent-Suggested A/B Test</div>
                  <div className="alert av mb12"><strong>Hypothesis:</strong> {result.suggestedABTest.hypothesis}</div>
                  <div className="vc" style={{borderColor:"rgba(92,75,138,0.35)"}}>
                    <div className="vp">VARIANT B (test)</div>
                    <div style={{fontWeight:600,marginBottom:6}}>{result.suggestedABTest.variantHook}</div>
                    <div className="vt">{result.suggestedABTest.variantContent}</div>
                    <div className="f g8 mt10"><button className="btn bv bsm" onClick={pickAB}>Use this variant →</button><CopyBtn text={result.suggestedABTest.variantContent} label="Copy"/></div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
      {step===3&&sel&&(
        <div className="card">
          <div className="ct">✅ Review & Approve</div>
          <div className="fg"><label className="lbl">Internal title</label><input className="inp" value={ptitle} onChange={e=>setPtitle(e.target.value)}/></div>
          <div className="fg"><label className="lbl">Post content — edit freely</label><textarea className="ta" style={{minHeight:250}} value={edited} onChange={e=>setEdited(e.target.value)}/></div>
          <div className="fg"><label className="lbl"><input type="checkbox" checked={isTest} onChange={e=>setIsTest(e.target.checked)} style={{marginRight:7}}/> Mark as A/B test (queues for 7-day review)</label></div>
          <div className="f fac g12"><button className="btn bg" onClick={approve}>Approve & Send to Publishing →</button><button className="btn bgh" onClick={()=>setStep(2)}>← Back</button><CopyBtn text={edited}/></div>
        </div>
      )}
    </div>
  );
}

function Publishing({ posts, setPosts, reviewQueue, setReviewQueue }) {
  const queue = posts.filter(p=>p.status==="approved");
  const published = posts.filter(p=>p.status==="published");
  const [urls,setUrls] = useState({});
  const publish = id => {
    const url=urls[id]||""; if(!url) return;
    const post=posts.find(p=>p.id===id);
    setPosts(prev=>prev.map(p=>p.id===id?{...p,status:"published",url,daysLive:0}:p));
    const due=new Date(); due.setDate(due.getDate()+7);
    setReviewQueue(q=>[...q,{id:Date.now(),postId:id,postTitle:post?.title||"Post",dueDate:due.toISOString().slice(0,10),status:"ready",platform:post?.platform||"LinkedIn",docViews:0,calls:0,impressions:0,format:post?.format,theme:post?.theme,testGroup:post?.testGroup,aiProposal:null}]);
  };
  return (
    <div>
      <div className="card mb16">
        <div className="ct">📋 Publishing Queue ({queue.length})</div>
        {queue.length===0&&<div className="es"><div className="esi">📭</div><p>Queue empty. Approve a post in the Content Engine.</p></div>}
        {queue.map(p=>(
          <div key={p.id} className="li">
            <div className="lidate">{p.date.slice(5)}</div>
            <div className="libody">
              <div className="f fac g8 mb8"><span className="tag tb">{p.platform}</span><span className="tag ti">{p.theme}</span>{p.format&&<span className="tag tv">{p.format}</span>}{p.isTest&&<span className="tag ttest">A/B TEST</span>}<span className="xs muted">{p.trackedLink}</span></div>
              <div className="lititle">{p.title}</div>
              <div className="liprev">{p.content}</div>
              <div className="f fac g8 mt10"><CopyBtn text={p.content}/>
                <input className="inp" style={{maxWidth:270}} placeholder="Paste live post URL..." value={urls[p.id]||""} onChange={e=>setUrls(u=>({...u,[p.id]:e.target.value}))}/>
                <button className="btn br bsm" onClick={()=>publish(p.id)} disabled={!urls[p.id]}>Mark Published →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="ct">✅ Published ({published.length})</div>
        <table>
          <thead><tr><th>Date</th><th>Post</th><th>Platform</th><th>Format</th><th>Doc Views</th><th>Calls</th><th>Status</th></tr></thead>
          <tbody>{published.map(p=>(
            <tr key={p.id}>
              <td className="mono xs">{p.date}</td>
              <td style={{fontWeight:500,maxWidth:200}}>{p.title}</td>
              <td><span className="tag tb">{p.platform}</span></td>
              <td className="xs muted">{p.format||"—"}</td>
              <td style={{color:"var(--gold)",fontWeight:600}}>{p.docViews}</td>
              <td>{p.calls}</td>
              <td>{p.proven?<span className="tag tprov">Proven</span>:<span className="tag ts">Live</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

const TRACKING_TABS = ["All","LI","FB","Insta","YT"];
const PLATFORM_MAP = { LI:"LinkedIn", FB:"Facebook", Insta:"Instagram", YT:"YouTube" };
const PLATFORM_LINKS = {
  LI: ["LinkedIn Analytics","https://www.linkedin.com/analytics/creator/"],
  FB: ["Facebook Insights","https://www.facebook.com/insights/"],
  Insta: ["Instagram Insights","https://www.instagram.com/"],
  YT: ["YouTube Studio","https://studio.youtube.com/"],
};
const COLS = {
  LI:    ["impressions","clicks","reactions","comments","docViews","calls"],
  FB:    ["impressions","reach","saves","likes","comments","docViews","calls"],
  Insta: ["impressions","reach","saves","likes","comments","docViews","calls"],
  YT:    ["views","watchTime","likes","comments","docViews","calls"],
};
const COL_LABELS = {
  impressions:"Impressions", clicks:"Clicks", reactions:"Reactions",
  comments:"Comments", reach:"Reach", saves:"Saves", likes:"Likes",
  docViews:"Doc Views 🎯", calls:"Calls", views:"Views", watchTime:"Watch %",
};

function Tracking({ posts, setPosts }) {
  const published = posts.filter(p=>p.status==="published");
  const [tab, setTab] = useState("All");
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const syncDocViews = async () => {
    setSyncLoading(true); setSyncMsg("");
    try {
      const ids = published.map(p=>p.id).join(",");
      const url = ids ? `/api/counts?ids=${ids}&global=1` : `/api/counts?global=1`;
      const res = await fetch(url);
      const counts = await res.json();
      const globalTotal = counts["_offer"] ?? null;
      delete counts["_offer"];
      if (Object.keys(counts).length > 0) {
        setPosts(prev=>prev.map(p=>counts[p.id]!==undefined?{...p,docViews:counts[p.id]}:p));
      }
      const postMsg = Object.keys(counts).length > 0 ? `${Object.keys(counts).length} post${Object.keys(counts).length!==1?"s":""} synced` : "";
      const globalMsg = globalTotal !== null ? `${globalTotal} total offer doc views` : "";
      setSyncMsg("↻ " + ([postMsg, globalMsg].filter(Boolean).join(" · ") || "Synced"));
    } catch(e) {
      setSyncMsg("Sync failed — check Upstash env vars are set in Vercel");
    } finally { setSyncLoading(false); }
  };

  useEffect(()=>{
    const d = {};
    published.forEach(p=>{
      d[p.id] = {
        impressions: p.impressions??0, engagement: p.engagement??0,
        docViews: p.docViews??0, calls: p.calls??0,
        clicks: p.clicks??0, reactions: p.reactions??0,
        comments: p.comments??0, reach: p.reach??0,
        saves: p.saves??0, views: p.views??0,
        watchTime: p.watchTime??0, likes: p.likes??0,
      };
    });
    setDraft(d);
  }, [posts]);

  const set = (id, field, val) => setDraft(d=>({...d,[id]:{...(d[id]||{}),[field]:val}}));

  const saveAll = () => {
    setPosts(prev=>prev.map(p=>{
      const v = draft[p.id]; if(!v) return p;
      const num = f => Number(v[f]||0);
      return {...p,
        impressions:num("impressions"), engagement:num("engagement"),
        docViews:num("docViews"), calls:num("calls"),
        clicks:num("clicks"), reactions:num("reactions"),
        comments:num("comments"), reach:num("reach"),
        saves:num("saves"), views:num("views"),
        watchTime:num("watchTime"), likes:num("likes"),
      };
    }));
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const needsUpdate = p => (p.impressions??0)===0 && (p.docViews??0)===0;
  const totalDV = published.reduce((s,p)=>s+(p.docViews??0),0);
  const totalImp = published.reduce((s,p)=>s+(p.impressions??0),0);
  const totalCalls = published.reduce((s,p)=>s+(p.calls??0),0);
  const dvRate = totalImp>0 ? ((totalDV/totalImp)*1000).toFixed(1) : "—";

  const platformFilter = tab==="All" ? null : PLATFORM_MAP[tab];
  const visible = platformFilter ? published.filter(p=>p.platform===platformFilter) : published;
  const cols = tab!=="All" ? COLS[tab] : null;

  const numInp = (id, field, gold=false) => {
    const v = draft[id]?.[field] ?? "";
    return (
      <input type="number" value={v===""?"":v} onChange={e=>set(id,field,e.target.value)} placeholder="0"
        style={{width:74,padding:"5px 7px",border:gold?"2px solid var(--gold)":"1px solid var(--border)",borderRadius:2,
          fontSize:12.5,fontFamily:"DM Mono,monospace",fontWeight:gold?600:400,
          background:gold?"rgba(201,168,76,0.06)":"var(--paper)"}}/>
    );
  };

  return (
    <div>
      {/* Doc view sync */}
      <div className="card mb16">
        <div className="ct">🔗 Doc View Tracking
          <div className="cta">
            <button className="btn bp bsm" disabled={syncLoading} onClick={syncDocViews}>
              {syncLoading?"Syncing…":"↻ Sync Doc Views"}
            </button>
            {syncMsg&&<span className="xs" style={{color:"var(--sage)",fontFamily:"DM Mono,monospace",marginLeft:8}}>{syncMsg}</span>}
          </div>
        </div>
        <div className="f fac g12">
          <div className="xs" style={{background:"rgba(74,103,65,0.08)",border:"1px solid rgba(74,103,65,0.2)",borderRadius:2,padding:"7px 12px",fontFamily:"DM Mono,monospace",fontSize:11,color:"var(--sage)",letterSpacing:0.3}}>
            bgb.coach/offer?ref=<span style={{opacity:0.55}}>postId</span>
          </div>
          <div className="xs muted">Every post gets a clean tracked link. Set <code style={{fontSize:11}}>OFFER_DOC_URL</code> in Vercel env vars → clicks auto-count → hit Sync to pull them in.</div>
        </div>
      </div>

      {/* summary strip */}
      <div className="g4 mb16">
        <div className="sc gold"><div className="sl">Total Doc Views</div><div className="sv">{totalDV}</div></div>
        <div className="sc rust"><div className="sl">Calls Booked</div><div className="sv">{totalCalls}</div></div>
        <div className="sc sage"><div className="sl">DV / 1k Imp</div><div className="sv">{dvRate}</div></div>
        <div className="sc ink"><div className="sl">Posts Live</div><div className="sv">{published.length}</div></div>
      </div>

      {published.length===0&&<div className="es card"><div className="esi">📊</div><p>No published posts yet. Go Live on a queued post to start tracking.</p></div>}

      {published.length>0&&(
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          {/* platform tab bar + save */}
          <div className="f fac fjb" style={{padding:"12px 16px",borderBottom:"1px solid var(--border)"}}>
            <div className="f g4x">
              {TRACKING_TABS.map(t=>(
                <button key={t} className={`btn bsm ${tab===t?"bp":"bo"}`} onClick={()=>setTab(t)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="f fac g8">
              {tab!=="All"&&(
                <a href={PLATFORM_LINKS[tab]?.[1]} target="_blank" rel="noreferrer"
                  className="btn bo bsm">{PLATFORM_LINKS[tab]?.[0]} ↗</a>
              )}
              <button className={`btn bsm ${saved?"bsa":"bg"}`} onClick={saveAll}>{saved?"✓ Saved":"Save All →"}</button>
            </div>
          </div>

          {/* All tab — read-only summary */}
          {tab==="All"&&(
            <table>
              <thead>
                <tr>
                  <th style={{width:"45%"}}>Post</th>
                  <th>Platform</th>
                  <th style={{color:"var(--gold)"}}>Doc Views 🎯</th>
                  <th>Calls</th>
                  <th>DV/1k</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(p=>{
                  const dv = p.docViews??0;
                  const imp = p.impressions??0;
                  const rate = imp>0?((dv/imp)*1000).toFixed(1):"—";
                  return (
                    <tr key={p.id} style={needsUpdate(p)?{background:"rgba(201,168,76,0.04)"}:{}}>
                      <td>
                        <div style={{fontWeight:600,fontSize:12.5,marginBottom:2}}>{p.title}</div>
                        <div className="xs muted">{p.date}{needsUpdate(p)&&<span style={{color:"var(--rust)",marginLeft:6}}>· needs data</span>}</div>
                      </td>
                      <td><span className="tag tb">{p.platform}</span></td>
                      <td style={{color:"var(--gold)",fontWeight:600,fontFamily:"DM Mono,monospace",fontSize:13}}>{dv}</td>
                      <td style={{fontFamily:"DM Mono,monospace",fontSize:13}}>{p.calls??0}</td>
                      <td className="xs muted" style={{fontFamily:"DM Mono,monospace"}}>{rate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Platform-specific editable table */}
          {tab!=="All"&&(
            <>
              {visible.length===0&&(
                <div style={{padding:"32px 20px",textAlign:"center",color:"var(--ink60)"}}>
                  <div className="xs muted">No {PLATFORM_MAP[tab]} posts yet. Posts go live when you hit Go Live in the Content Queue.</div>
                </div>
              )}
              {visible.length>0&&(
                <table>
                  <thead>
                    <tr>
                      <th style={{width:"30%"}}>Post</th>
                      {cols.map(c=>(
                        <th key={c} style={{color:c==="docViews"?"var(--gold)":undefined}}>{COL_LABELS[c]}</th>
                      ))}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(p=>(
                      <tr key={p.id} style={needsUpdate(p)?{background:"rgba(201,168,76,0.04)"}:{}}>
                        <td>
                          <div style={{fontWeight:600,fontSize:12.5,marginBottom:2}}>{p.title}</div>
                          <div className="xs muted">{p.date}{needsUpdate(p)&&<span style={{color:"var(--rust)",marginLeft:6}}>· needs data</span>}</div>
                        </td>
                        {cols.map(c=>(
                          <td key={c}>{numInp(p.id, c, c==="docViews")}</td>
                        ))}
                        <td>{p.url&&<a href={p.url} target="_blank" rel="noreferrer" className="btn bo bsm">↗</a>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {/* per-platform totals */}
              {visible.length>0&&(()=>{
                const ptDV = visible.reduce((s,p)=>s+Number(draft[p.id]?.docViews||p.docViews||0),0);
                const ptImp = visible.reduce((s,p)=>s+Number(draft[p.id]?.impressions||p.impressions||0),0);
                const ptCalls = visible.reduce((s,p)=>s+Number(draft[p.id]?.calls||p.calls||0),0);
                return (
                  <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)",display:"flex",gap:24,flexWrap:"wrap"}}>
                    <span className="xs muted">{PLATFORM_MAP[tab]} totals:</span>
                    <span className="xs"><strong>{ptImp.toLocaleString()}</strong> impressions</span>
                    <span className="xs" style={{color:"var(--gold)"}}><strong>{ptDV}</strong> doc views</span>
                    <span className="xs"><strong>{ptCalls}</strong> calls</span>
                    <span className="xs muted">{ptImp>0?((ptDV/ptImp)*1000).toFixed(1):"—"} DV/1k imp</span>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function WeeklyReport({ posts, formats, mind }) {
  const [report,setReport] = useState(null); const [loading,setLoading] = useState(false); const [err,setErr] = useState("");
  const pub = posts.filter(p=>p.status==="published");
  const totalDV=pub.reduce((s,p)=>s+p.docViews,0); const totalCalls=pub.reduce((s,p)=>s+p.calls,0);
  const gen = async () => {
    if(pub.length===0){setErr("No published posts to analyse.");return;}
    setLoading(true); setErr("");
    try{setReport(await genReport(pub,formats,mind));}catch(e){setErr("Report failed: "+e.message);}finally{setLoading(false);}
  };
  const iMap={win:"🏆",learn:"📚",test:"⚗️",next:"🎯"};
  const tMap={win:"ts",learn:"tg",test:"tv",next:"tr"};
  return (
    <div>
      <div className="g3 mb20">
        <div className="sc gold"><div className="sl">Doc Views</div><div className="sv">{totalDV}</div><div className="ss">primary conversion signal</div></div>
        <div className="sc rust"><div className="sl">Calls Booked</div><div className="sv">{totalCalls}</div><div className="ss">of 5 target</div></div>
        <div className="sc sage"><div className="sl">Posts Live</div><div className="sv">{pub.length}</div><div className="ss">content deployed</div></div>
      </div>
      {err&&<div className="alert ar">{err}</div>}
      <div className="card mb20" style={{textAlign:"center",padding:34}}>
        <div style={{fontSize:34,marginBottom:10}}>🤖</div>
        <div className="serif" style={{fontSize:19,marginBottom:5}}>Agent Weekly Report</div>
        <div className="muted sm mb16">Reviews all post data · Identifies what's working · Proposes format promotions · Sets next week's agenda</div>
        <button className="btn bp" onClick={gen} disabled={loading}>{loading?<><span className="spin"/> Analysing...</>:"Generate Agent Report →"}</button>
      </div>
      {report&&(
        <>
          <div className="card mb16">
            <div className="ct">📋 {report.headline}</div>
            <div className="f g12 fw">
              {report.topFormat&&<div><div className="xs muted mb4">Top format</div><span className="tag tprov">{report.topFormat}</span></div>}
              {report.topTheme&&<div><div className="xs muted mb4">Top theme</div><span className="tag tg">{report.topTheme}</span></div>}
              {report.docViewsPerImpression&&<div><div className="xs muted mb4">DV / 1k imp</div><span className="tag ts">{report.docViewsPerImpression}</span></div>}
            </div>
          </div>
          <div className="card mb16">
            <div className="ct">💡 Intelligence Report</div>
            {report.insights?.map((ins,i)=>(
              <div key={i} className="li">
                <div style={{width:20,flexShrink:0,fontSize:15}}>{iMap[ins.type]||"→"}</div>
                <div className="libody">
                  <div className="f fac g8 mb4"><span className={`tag ${tMap[ins.type]||"ti"}`}>{ins.type?.toUpperCase()}</span></div>
                  <div style={{fontWeight:600,marginBottom:3}}>{ins.title}</div>
                  <div className="sm muted">{ins.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="g2">
            <div className="card">
              <div className="ct">⚗️ Format Recommendations</div>
              {report.formatsToPromote?.length>0&&<div className="mb12"><div className="xs muted mb6">Promote to Proven</div>{report.formatsToPromote.map(f=><div key={f} className="mb4"><span className="tag ts">✓ {f}</span></div>)}</div>}
              {report.nextTests?.length>0&&<div><div className="xs muted mb6">New Tests to Run</div>{report.nextTests.map((t,i)=><div key={i} className="sm mb6">· {t}</div>)}</div>}
            </div>
            <div className="card">
              <div className="ct">🎬 Content Agenda — This Week</div>
              {report.contentQueue?.map((idea,i)=>(
                <div key={i} className="li" style={{padding:"9px 0"}}>
                  <div style={{width:20,flexShrink:0,fontFamily:"Playfair Display,serif",color:"var(--gold)",fontWeight:700}}>{i+1}</div>
                  <div className="sm">{idea}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ContentLibrary({ assets, setAssets }) {
  const [f,setF] = useState({title:"",type:"notes",content:"",tags:""});
  const [saved,setSaved] = useState(false);
  const save = () => {
    if(!f.title||!f.content) return;
    setAssets(prev=>[...prev,{id:Date.now(),title:f.title,type:f.type,content:f.content,tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean),date:new Date().toISOString().slice(0,10),summary:f.content.slice(0,130)+"..."}]);
    setF({title:"",type:"notes",content:"",tags:""}); setSaved(true); setTimeout(()=>setSaved(false),1800);
  };
  return (
    <div className="g2">
      <div className="card">
        <div className="ct">✍️ Capture Raw Thinking</div>
        <div className="fg"><label className="lbl">Title</label><input className="inp" placeholder="What is this?" value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))}/></div>
        <div className="fg"><label className="lbl">Type</label>
          <select className="sel" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))}>
            {["notes","transcript","voice","idea","client story"].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="fg"><label className="lbl">Content</label><textarea className="ta" style={{minHeight:170}} placeholder="Paste raw thinking here..." value={f.content} onChange={e=>setF(p=>({...p,content:e.target.value}))}/></div>
        <div className="fg"><label className="lbl">Tags</label><input className="inp" placeholder="delegation, GM install..." value={f.tags} onChange={e=>setF(p=>({...p,tags:e.target.value}))}/></div>
        <button className={`btn w100 ${saved?"bsa":"bp"}`} onClick={save}>{saved?"✓ Saved to Library":"Save to Library"}</button>
      </div>
      <div className="card" style={{maxHeight:680,overflowY:"auto"}}>
        <div className="ct">📚 Content Library ({assets.length})</div>
        {assets.map(a=>(
          <div key={a.id} className="li">
            <div className="lidate">{a.date.slice(5)}</div>
            <div className="libody">
              <div className="f fac g8 mb4"><span className="tag ti">{a.type}</span></div>
              <div className="lititle">{a.title}</div>
              <div className="liprev">{a.summary}</div>
              {a.tags?.length>0&&<div className="f g4x fw mt8">{a.tags.map(t=><span key={t} className="tag tg">{t}</span>)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ANALYTICS API FUNCTIONS ─────────────────────────────────────────────────
async function pullInstagramAnalytics(token) {
  const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
  const me = await meRes.json();
  if (me.error) throw new Error("Instagram auth failed: " + me.error.message);
  const mediaRes = await fetch(`https://graph.instagram.com/${me.id}/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count&limit=50&access_token=${encodeURIComponent(token)}`);
  const media = await mediaRes.json();
  if (media.error) throw new Error("Instagram media failed: " + media.error.message);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-90);
  const recent = (media.data||[]).filter(p=>new Date(p.timestamp)>cutoff);
  const posts = await Promise.all(recent.map(async p=>{
    try {
      const ins = await fetch(`https://graph.instagram.com/${p.id}/insights?metric=impressions,reach,saved&access_token=${encodeURIComponent(token)}`);
      const id = await ins.json();
      const get = name=>(id.data||[]).find(m=>m.name===name)?.values?.[0]?.value||0;
      return { id:p.id, caption:p.caption||"", media_type:p.media_type, timestamp:p.timestamp, permalink:p.permalink, likes:p.like_count||0, comments:p.comments_count||0, impressions:get("impressions"), reach:get("reach"), saved:get("saved") };
    } catch { return { id:p.id, caption:p.caption||"", media_type:p.media_type, timestamp:p.timestamp, permalink:p.permalink, likes:p.like_count||0, comments:p.comments_count||0, impressions:0, reach:0, saved:0 }; }
  }));
  const totalImpressions=posts.reduce((s,p)=>s+p.impressions,0);
  const totalSaves=posts.reduce((s,p)=>s+p.saved,0);
  return { platform:"Instagram", username:me.username, scrapedAt:new Date().toISOString(), posts, summary:{ totalPosts:posts.length, totalImpressions, totalSaves, avgSaved:posts.length?Math.round(totalSaves/posts.length):0 } };
}

async function pullFacebookAnalytics(token, pageId) {
  const postsRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,permalink_url&limit=50&access_token=${encodeURIComponent(token)}`);
  const postsData = await postsRes.json();
  if (postsData.error) throw new Error("Facebook failed: " + postsData.error.message);
  const posts = await Promise.all((postsData.data||[]).map(async p=>{
    try {
      const ins = await fetch(`https://graph.facebook.com/v19.0/${p.id}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${encodeURIComponent(token)}`);
      const id = await ins.json();
      const get = name=>(id.data||[]).find(m=>m.name===name)?.values?.[0]?.value||0;
      return { id:p.id, message:p.message||"", created_time:p.created_time, permalink_url:p.permalink_url, impressions:get("post_impressions"), engagedUsers:get("post_engaged_users"), clicks:get("post_clicks") };
    } catch { return { id:p.id, message:p.message||"", created_time:p.created_time, permalink_url:p.permalink_url, impressions:0, engagedUsers:0, clicks:0 }; }
  }));
  const totalImpressions=posts.reduce((s,p)=>s+p.impressions,0);
  const totalClicks=posts.reduce((s,p)=>s+p.clicks,0);
  return { platform:"Facebook", pageId, scrapedAt:new Date().toISOString(), posts, summary:{ totalPosts:posts.length, totalImpressions, totalClicks } };
}

async function pullYouTubeAnalytics(apiKey, channelId) {
  const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${apiKey}`);
  const search = await searchRes.json();
  if (search.error) throw new Error("YouTube failed: " + search.error.message);
  const ids = (search.items||[]).map(i=>i.id.videoId).filter(Boolean);
  if (!ids.length) return { platform:"YouTube", channelId, scrapedAt:new Date().toISOString(), videos:[], summary:{totalVideos:0,totalViews:0,avgViews:0} };
  const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids.join(",")}&key=${apiKey}`);
  const stats = await statsRes.json();
  const videos = (stats.items||[]).map(v=>({ id:v.id, title:v.snippet?.title||"", publishedAt:v.snippet?.publishedAt||"", viewCount:Number(v.statistics?.viewCount||0), likeCount:Number(v.statistics?.likeCount||0), commentCount:Number(v.statistics?.commentCount||0), url:`https://youtube.com/watch?v=${v.id}` }));
  const totalViews=videos.reduce((s,v)=>s+v.viewCount,0);
  return { platform:"YouTube", channelId, scrapedAt:new Date().toISOString(), videos, summary:{ totalVideos:videos.length, totalViews, avgViews:videos.length?Math.round(totalViews/videos.length):0 } };
}

async function analyzeAnalytics(data, mind, formats) {
  const raw = await callClaude(
    `You are the BGB Content Intelligence agent. Analyse platform analytics for Stephen at BGB Consulting. He helps $1M–$5M business owners install a GM and escape the founder trap.\n${voiceCtx(mind)}

SIGNAL PRIORITY ORDER (most to least important): Clicks → Engagement (reactions+comments+shares) → Impressions → Hook style → Content structure → CTA

CRITICAL RULES FOR RECOMMENDATIONS:
1. Sort posts by clicks first to identify true winners
2. For HIGH-performing posts: identify WHAT WORKED — including any unusual, unconventional, or "incorrect" stylistic choices. Treat these as PATTERN INTERRUPTS that drove curiosity. Recommend replicating them, not fixing them.
3. For LOW-performing posts: identify what to avoid or change
4. NEVER recommend removing a stylistic element that appears in a high-click or high-engagement post — the data overrides style theory
5. Each recommendation must have a type: "replicate" (high performer technique — try again), "avoid" (low performer pattern), or "test" (unproven idea)

Return ONLY valid JSON: {"platform":"...","topPosts":[{"id":"...","title":"...","whyItWorked":"...","signal":"high|medium|low","clicks":0,"impressions":0}],"themes":["..."],"hookPatterns":["..."],"insights":["..."],"recommendations":[{"text":"...","category":"framework|contrarian|language","type":"replicate|avoid|test"}]}`,
    `Analytics data:\n${JSON.stringify(data)}`,
    4000
  );
  return JSON.parse(raw);
}

function parseLinkedInCSV(text) {
  const MONTHS = {January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};
  const parseDate = str => { const m=str.match(/([A-Z][a-z]+)\s+(\d+),\s+(\d{4})/); return m?`${m[3]}-${MONTHS[m[1]]||'00'}-${m[2].padStart(2,'0')}`:str.slice(0,10); };
  const lines = text.split('\n'); const header = lines[0].toLowerCase();
  const isRichMedia = header.includes('media description');
  const rows = []; let cur = '', inQ = false;
  for (let i=1;i<lines.length;i++) { for (const ch of lines[i]) { if(ch==='"') inQ=!inQ; cur+=ch; } if(!inQ){rows.push(cur);cur='';} else cur+='\n'; }
  const parseRow = row => { const cols=[]; let f='',q=false; for(const ch of row){if(ch==='"'){q=!q;}else if(ch===','&&!q){cols.push(f.trim().replace(/^"|"$/g,''));f='';}else f+=ch;} cols.push(f.trim().replace(/^"|"$/g,'')); return cols; };
  return rows.filter(r=>r.trim()).map(r=>{ const cols=parseRow(r);
    if(isRichMedia){ const [dateRaw,,desc,,link]=cols; if(!desc||desc==='-') return null; return {id:link||dateRaw, date:parseDate(dateRaw), content:desc, platform:'LinkedIn'}; }
    else { const [dateRaw,,,,commentary]=cols; if(!commentary?.trim()) return null; return {id:dateRaw+commentary.slice(0,20), date:parseDate(dateRaw), content:commentary, platform:'LinkedIn'}; }
  }).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date));
}

function parseLinkedInAnalytics(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV appears empty — make sure you exported the Analytics CSV, not the post history CSV.");
  const header = lines[0].split(",").map(h=>h.trim().replace(/"/g,"").toLowerCase());
  const idx = name => header.findIndex(h=>h.includes(name));
  const dateIdx=idx("date"), linkIdx=idx("link"), typeIdx=idx("type"),
    impIdx=idx("impression"), clickIdx=idx("click"), ctrIdx=idx("ctr"),
    likeIdx=idx("like"), commentIdx=idx("comment"), shareIdx=idx("share");
  if (impIdx===-1) throw new Error("Couldn't find Impressions column — make sure this is the LinkedIn Creator Analytics export, not the post history export.");
  const posts = lines.slice(1).map((line,i)=>{
    const cols = line.split(",").map(c=>c.trim().replace(/"/g,""));
    return {
      id: i,
      date: cols[dateIdx]||"",
      url: cols[linkIdx]||"",
      type: cols[typeIdx]||"",
      impressions: Number(cols[impIdx]||0),
      clicks: Number(cols[clickIdx]||0),
      ctr: cols[ctrIdx]||"0%",
      likes: Number(cols[likeIdx]||0),
      comments: Number(cols[commentIdx]||0),
      shares: Number(cols[shareIdx]||0),
    };
  }).filter(p=>p.impressions>0||p.clicks>0);
  const totalImp = posts.reduce((s,p)=>s+p.impressions,0);
  const totalClicks = posts.reduce((s,p)=>s+p.clicks,0);
  const ctrNums = posts.map(p=>parseFloat(p.ctr)).filter(n=>!isNaN(n));
  const avgCTR = ctrNums.length ? (ctrNums.reduce((s,n)=>s+n,0)/ctrNums.length).toFixed(2)+"%" : "0%";
  return { posts, summary:{ totalPosts:posts.length, totalImpressions:totalImp, totalClicks, avgCTR } };
}

// ─── CONTENT DNA ─────────────────────────────────────────────────────────────
// Sanitise post text before sending to Claude — strips chars that break JSON
function sanitiseForPrompt(str, maxLen=350) {
  return (str||"").slice(0,maxLen).replace(/[\u0000-\u001F\u007F]/g," ").replace(/\\/g," ").replace(/"/g,"'");
}

// Robust JSON parser — handles minor formatting issues in Claude responses
function parseJSON(raw) {
  // Try direct parse first
  try { return JSON.parse(raw); } catch(_) {}
  // Try extracting largest JSON object
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch(_) {} }
  // Last resort: strip control chars and retry
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g," ");
  const match2 = cleaned.match(/\{[\s\S]*\}/);
  if (match2) { try { return JSON.parse(match2[0]); } catch(_) {} }
  throw new Error("Could not parse JSON from Claude response");
}

async function runContentDNA(allPosts, mind, onProgress) {
  const clean = posts => posts.map(p=>({date:p.date, content:sanitiseForPrompt(p.content)}));

  // Pass 1: Theme & topic mapping
  onProgress("Pass 1/4 — mapping themes across your history...", 10);
  const early = allPosts.slice(Math.max(0,allPosts.length-200), allPosts.length);
  const recent = allPosts.slice(0, Math.min(200, allPosts.length));
  const earlySample = early.filter((_,i)=>i%Math.max(1,Math.floor(early.length/20))===0).slice(0,20);
  const recentSample = recent.filter((_,i)=>i%Math.max(1,Math.floor(recent.length/20))===0).slice(0,20);

  const pass1 = await callClaude(
    `You are the BGB Content Intelligence agent doing a deep Content DNA analysis for Stephen at BGB Consulting. He helps $1M-$5M business owners install a GM and escape the founder trap.\nReturn ONLY valid JSON with no line breaks inside string values: {"themes":[{"name":"...","frequency":"high|medium|low","evolutionNote":"..."}],"topicClusters":["..."],"audienceAngle":"..."}`,
    `EARLY posts (${earlySample.length}):\n${JSON.stringify(clean(earlySample))}\n\nRECENT posts (${recentSample.length}):\n${JSON.stringify(clean(recentSample))}`,
    4000
  );
  const themes = parseJSON(pass1);
  onProgress("Pass 2/4 — extracting hook formulas and opening lines...", 35);

  // Pass 2: Hook & opening line analysis
  const hookStep = Math.max(1, Math.floor(allPosts.length/40));
  const hooks = allPosts.filter((_,i)=>i%hookStep===0).slice(0,40)
    .map(p=>sanitiseForPrompt(p.content?.split('\n')[0]||"", 120)).filter(h=>h.length>10);
  const pass2 = await callClaude(
    `You are the BGB Content Intelligence agent analysing opening lines and hook formulas for Stephen at BGB Consulting.\nReturn ONLY valid JSON with no line breaks inside string values: {"hookFormulas":[{"pattern":"...","example":"...","strength":"strong|medium|weak"}],"openingWordPatterns":["..."],"avoidPatterns":["..."]}`,
    `Opening lines from ${hooks.length} posts:\n${JSON.stringify(hooks)}`,
    4000
  );
  const hookData = parseJSON(pass2);
  onProgress("Pass 3/4 — analysing voice, style and language DNA...", 60);

  // Pass 3: Voice & style deep analysis
  const styleStep = Math.max(1, Math.floor(allPosts.length/30));
  const styleSample = allPosts.filter((_,i)=>i%styleStep===0).slice(0,30);
  const pass3 = await callClaude(
    `You are the BGB Content Intelligence agent doing a deep voice and style analysis for Stephen.\nReturn ONLY valid JSON with no line breaks inside string values: {"voiceSignatures":["..."],"vocabularyDNA":["..."],"structuralPatterns":["..."],"thingsToAvoid":["..."]}`,
    `Posts for voice analysis:\n${JSON.stringify(clean(styleSample))}`,
    4000
  );
  const voiceData = parseJSON(pass3);
  onProgress("Pass 4/4 — synthesising Content DNA report...", 80);

  // Pass 4: Synthesis
  const pass4 = await callClaude(
    `You are the BGB Content Intelligence agent. Synthesise a Content DNA report for Stephen.\nReturn ONLY valid JSON with no line breaks inside string values: {"contentDNASummary":"...","topPerformingAngles":["..."],"underusedAngles":["..."],"mindBankRecommendations":[{"title":"...","body":"...","category":"frameworks|clientStories|contrarian|language","tags":["..."],"why":"..."}],"whatWorksRecommendations":[{"formatName":"...","description":"...","why":"..."}],"weeklyContentPlan":["..."]}`,
    `Themes: ${JSON.stringify(themes)}\nHooks: ${JSON.stringify(hookData)}\nVoice: ${JSON.stringify(voiceData)}\nTotal posts: ${allPosts.length}`,
    5000
  );
  const synthesis = parseJSON(pass4);
  onProgress("Complete.", 100);

  return { themes, hookData, voiceData, synthesis, totalPosts: allPosts.length };
}

function ContentDNAPage({ mind, setMind, formats, setFormats }) {
  const [posts, setPosts] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [added, setAdded] = useState({});

  const onProgress = (msg, pct) => { setProgress(msg); setProgressPct(pct); };

  const loadFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });

  const handleFiles = async (files) => {
    setErr(""); const newPosts = [...posts]; const newSources = [...sources];
    for (const file of Array.from(files)) {
      try {
        const text = await loadFile(file);
        let parsed = [];
        if (file.name.endsWith(".json")) {
          parsed = parseFacebookExport(text);
        } else if (file.name.endsWith(".csv")) {
          // reuse LinkedIn CSV logic inline
          const lines = text.split('\n'); const header = lines[0].toLowerCase();
          if (header.includes('sharecommentary') || header.includes('media description')) {
            parsed = parseLinkedInCSV(text);
          } else {
            setErr(`Unrecognised CSV format in ${file.name}`); continue;
          }
        }
        if (parsed.length) {
          newPosts.push(...parsed);
          newSources.push(`${file.name} (${parsed.length} posts)`);
        }
      } catch(e) { setErr(`Error reading ${file.name}: ${e.message}`); }
    }
    // deduplicate by id
    const seen = new Set(); const deduped = newPosts.filter(p=>{ if(seen.has(p.id)) return false; seen.add(p.id); return true; });
    setPosts(deduped); setSources(newSources);
  };

  const run = async () => {
    if (!posts.length) return;
    setLoading(true); setErr(""); setResult(null); setProgress(""); setProgressPct(0);
    try { setResult(await runContentDNA(posts, mind, onProgress)); }
    catch(e) { setErr("Analysis failed: " + e.message); }
    finally { setLoading(false); }
  };

  const addEntryToMind = (rec, key) => {
    const id = key||rec.title;
    setMind(m=>({...m,[rec.category||"frameworks"]:[...m[rec.category||"frameworks"],{id:Date.now(),title:rec.title,body:rec.body,tags:rec.tags||["content-dna"]}]}));
    setAdded(a=>({...a,[id]:true}));
  };

  const addFormatToWhatWorks = (f, key) => {
    setFormats(prev=>[...prev,{id:Date.now(),name:f.formatName,description:f.description,status:"testing",avgDocViews:0,avgCalls:0,postsUsed:0,notes:f.why||""}]);
    setAdded(a=>({...a,[key]:true}));
  };

  return (
    <div>
      <div className="alert av mb20">
        <strong>Content DNA</strong> — deep 4-pass analysis of your entire post history. Upload your LinkedIn CSV and/or Facebook JSON export. Claude analyses themes, hook formulas, voice patterns, and gaps — then generates a Content DNA report with Mind Bank and What Works recommendations.
      </div>

      {/* File upload */}
      <div className="card mb16">
        <div className="ct">📂 Upload Post History</div>
        <div style={{border:"2px dashed var(--border)",borderRadius:2,padding:"28px 20px",textAlign:"center",background:"var(--paper)",marginBottom:12}}
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--gold)"}}
          onDragLeave={e=>{e.currentTarget.style.borderColor="var(--border)"}}
          onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--border)";handleFiles(e.dataTransfer.files);}}>
          <div style={{fontSize:28,marginBottom:8}}>📄</div>
          <div className="sm mb8">Drag files here or click to browse</div>
          <div className="xs muted mb12">LinkedIn: <strong>Shares.csv</strong> or <strong>Rich_Media.csv</strong> · Facebook: <strong>your_posts_1.json</strong></div>
          <input type="file" accept=".json,.csv" multiple style={{display:"none"}} id="dna-upload" onChange={e=>handleFiles(e.target.files)}/>
          <label htmlFor="dna-upload" className="btn bo" style={{cursor:"pointer"}}>Browse files</label>
        </div>
        {err&&<div className="alert ar mb12">{err}</div>}
        {sources.length>0&&<>
          <div className="xs muted mb8">Loaded sources:</div>
          {sources.map((s,i)=><div key={i} className="f fac g8 mb4"><span className="tag ts">✓</span><span className="sm">{s}</span></div>)}
          <div className="div"/>
          <div className="f fac g8">
            <div className="sc gold" style={{flex:1,padding:"12px 16px"}}><div className="sl">Total Posts</div><div className="sv">{posts.length}</div></div>
            <div className="sc sage" style={{flex:1,padding:"12px 16px"}}><div className="sl">Oldest</div><div className="sv" style={{fontSize:15}}>{posts.length?posts[posts.length-1]?.date:"—"}</div></div>
            <div className="sc rust" style={{flex:1,padding:"12px 16px"}}><div className="sl">Most Recent</div><div className="sv" style={{fontSize:15}}>{posts.length?posts[0]?.date:"—"}</div></div>
          </div>
          <div className="mt16">
            <button className="btn bp w100" style={{padding:"13px 16px",fontSize:14}} onClick={run} disabled={loading||!posts.length}>
              {loading?<><span className="spin-d spin"/> {progress}</>:"Run Content DNA Analysis →"}
            </button>
            {loading&&<div className="pb mt8"><div className="pf" style={{width:`${progressPct}%`,background:"var(--violet)"}}/></div>}
          </div>
        </>}
      </div>

      {result&&<>
        {/* DNA Summary */}
        <div className="card mb16" style={{borderColor:"rgba(92,75,138,0.4)"}}>
          <div className="ct">🧬 Your Content DNA</div>
          <div style={{fontSize:14,lineHeight:1.7,color:"var(--ink)",marginBottom:16}}>{result.synthesis.contentDNASummary}</div>
          <div className="g2">
            <div><div className="xs muted mb8">Top performing angles</div>{result.synthesis.topPerformingAngles?.map((a,i)=><div key={i} className="sm mb6">→ {a}</div>)}</div>
            <div><div className="xs muted mb8">Underused angles (opportunity)</div>{result.synthesis.underusedAngles?.map((a,i)=><div key={i} className="sm mb6 muted">· {a}</div>)}</div>
          </div>
        </div>

        {/* Themes */}
        <div className="card mb16">
          <div className="ct">🎯 Theme Map</div>
          <div className="g3">
            {result.themes.themes?.map((t,i)=>(
              <div key={i} className="kbi">
                <div className="kbih"><div className="kbit">{t.name}</div><span className={`tag ${t.frequency==="high"?"ts":t.frequency==="medium"?"tg":"tr"}`}>{t.frequency}</span></div>
                {t.evolutionNote&&<div className="kbib xs muted">{t.evolutionNote}</div>}
              </div>
            ))}
          </div>
          {result.themes.audienceAngle&&<div className="alert ag mt12"><strong>Audience angle:</strong> {result.themes.audienceAngle}</div>}
        </div>

        {/* Hook Formulas */}
        <div className="card mb16">
          <div className="ct">🎣 Hook Formulas</div>
          {result.hookData.hookFormulas?.map((h,i)=>(
            <div key={i} className="kbi">
              <div className="kbih">
                <div className="kbit">{h.pattern}</div>
                <span className={`tag ${h.strength==="strong"?"ts":h.strength==="medium"?"tg":"tr"}`}>{h.strength}</span>
              </div>
              {h.example&&<div className="kbib" style={{fontStyle:"italic"}}>"{h.example}"</div>}
            </div>
          ))}
          {result.hookData.avoidPatterns?.length>0&&<div className="mt12"><div className="xs muted mb6">Avoid these openings</div>{result.hookData.avoidPatterns.map((p,i)=><div key={i} className="sm mb4" style={{color:"var(--rust)"}}>✗ {p}</div>)}</div>}
        </div>

        {/* Voice DNA */}
        <div className="card mb16">
          <div className="ct">✍️ Voice DNA</div>
          <div className="g2">
            <div>
              {result.voiceData.voiceSignatures?.length>0&&<div className="mb12"><div className="xs muted mb6">Voice signatures</div>{result.voiceData.voiceSignatures.map((v,i)=><div key={i} className="sm mb4">· {v}</div>)}</div>}
              {result.voiceData.vocabularyDNA?.length>0&&<div className="mb12"><div className="xs muted mb6">Vocabulary DNA</div><div className="f g4x fw">{result.voiceData.vocabularyDNA.map(w=><span key={w} className="tag tg">{w}</span>)}</div></div>}
            </div>
            <div>
              {result.voiceData.structuralPatterns?.length>0&&<div className="mb12"><div className="xs muted mb6">Structural patterns</div>{result.voiceData.structuralPatterns.map((s,i)=><div key={i} className="sm mb4">· {s}</div>)}</div>}
              {result.voiceData.thingsToAvoid?.length>0&&<div><div className="xs muted mb6">Things to avoid</div>{result.voiceData.thingsToAvoid.map((t,i)=><div key={i} className="sm mb4" style={{color:"var(--rust)"}}>✗ {t}</div>)}</div>}
            </div>
          </div>
        </div>

        {/* This Week */}
        {result.synthesis.weeklyContentPlan?.length>0&&<div className="card mb16">
          <div className="ct">📅 7 Post Ideas — Based on Your DNA</div>
          {result.synthesis.weeklyContentPlan.map((idea,i)=>(
            <div key={i} className="li" style={{padding:"9px 0"}}>
              <div style={{width:24,flexShrink:0,fontFamily:"Playfair Display,serif",color:"var(--gold)",fontWeight:700}}>{i+1}</div>
              <div className="sm">{idea}</div>
            </div>
          ))}
        </div>}

        {/* Mind Bank Recommendations */}
        <div className="card mb16">
          <div className="ct">🧠 Mind Bank Recommendations <span className="xs muted" style={{fontWeight:400}}>— curated from {result.totalPosts} posts</span></div>
          <div className="alert ag mb16">These are the highest-signal entries worth adding. Pick the ones that feel true — don't add all of them.</div>
          {result.synthesis.mindBankRecommendations?.map((rec,i)=>{
            const key="dna-mind-"+i; const done=added[key];
            return (
              <div key={i} className="kbi" style={done?{opacity:0.5}:{}}>
                <div className="kbih">
                  <div className="kbit">{rec.title}</div>
                  <span className={`tag ${rec.category==="contrarian"?"tr":rec.category==="language"?"tv":"tg"}`}>{rec.category}</span>
                  <button className={`btn bsm mla ${done?"bsa":"bp"}`} onClick={()=>addEntryToMind(rec,key)} disabled={done}>{done?"✓ Added":"+ Add to Mind"}</button>
                </div>
                <div className="kbib">{rec.body}</div>
                {rec.why&&<div className="xs muted mt8" style={{fontStyle:"italic"}}>Why: {rec.why}</div>}
                {rec.tags?.length>0&&<div className="f g4x fw mt8">{rec.tags.map(t=><span key={t} className="tag ti">{t}</span>)}</div>}
              </div>
            );
          })}
        </div>

        {/* What Works Recommendations */}
        {result.synthesis.whatWorksRecommendations?.length>0&&<div className="card mb16">
          <div className="ct">✦ What Works Recommendations</div>
          {result.synthesis.whatWorksRecommendations.map((f,i)=>{
            const key="dna-fmt-"+i; const done=added[key];
            return (
              <div key={i} className="fc" style={done?{opacity:0.5}:{}}>
                <div className="fcname">{f.formatName}</div>
                <div className="fcdesc">{f.description}</div>
                {f.why&&<div className="xs muted mb10">{f.why}</div>}
                <button className={`btn bsm ${done?"bsa":"bv"}`} onClick={()=>addFormatToWhatWorks(f,key)} disabled={done}>{done?"✓ Added to Testing":"+ Add to What Works"}</button>
              </div>
            );
          })}
        </div>}
      </>}
    </div>
  );
}

function parseFacebookExport(jsonText) {
  const data = JSON.parse(jsonText);
  const raw = Array.isArray(data) ? data : (data.posts || []);
  return raw
    .map(p => ({
      id: String(p.timestamp),
      date: new Date(p.timestamp * 1000).toISOString().slice(0,10),
      content: p.data?.[0]?.post || "",
      title: p.title || "",
    }))
    .filter(p => p.content.trim().length > 20)
    .sort((a,b) => b.date.localeCompare(a.date));
}

async function analyzeFacebookHistory(posts, mind) {
  const step = Math.max(1, Math.floor(posts.length / 40));
  const sampled = posts.filter((_,i) => i < 20 || i % step === 0).slice(0,60);
  const raw = await callClaude(
    `You are the BGB Content Intelligence agent. Analyse Facebook post history for Stephen at BGB Consulting. He helps $1M–$5M business owners install a GM and escape the founder trap.\n${voiceCtx(mind)}\nReturn ONLY valid JSON: {"topThemes":["..."],"hookPatterns":["..."],"styleInsights":["..."],"underusedAngles":["..."],"recommendations":[{"text":"...","category":"framework|contrarian|language"}]}`,
    `Facebook posts (sample of ${sampled.length} from ${posts.length} total):\n${JSON.stringify(sampled.map(p=>({date:p.date,content:p.content})))}`,
    4000
  );
  return JSON.parse(raw);
}

// ─── ANALYTICS PAGE ──────────────────────────────────────────────────────────
function AnalyticsPage({ mind, setMind, formats, analyticsImport, setAnalyticsImport }) {
  const lsGet2 = (key, fallback) => { try { const s=localStorage.getItem(key); return s?JSON.parse(s):fallback; } catch{ return fallback; } };
  const [liData,setLiData] = useState(()=>lsGet2("bgb_li_data",null)); const [liErr,setLiErr] = useState(""); const [liAnalysis,setLiAnalysis] = useState(()=>lsGet2("bgb_li_analysis",null)); const [liALoading,setLiALoading] = useState(false);
  const [liParsing,setLiParsing] = useState(false); const [liParseErr,setLiParseErr] = useState("");
  useEffect(()=>{ if(liData) localStorage.setItem("bgb_li_data",JSON.stringify(liData)); else localStorage.removeItem("bgb_li_data"); },[liData]);
  useEffect(()=>{ if(liAnalysis) localStorage.setItem("bgb_li_analysis",JSON.stringify(liAnalysis)); else localStorage.removeItem("bgb_li_analysis"); },[liAnalysis]);
  const [igToken,setIgToken] = useState(()=>localStorage.getItem("bgb_ig_token")||"");
  useEffect(()=>{ localStorage.setItem("bgb_ig_token",igToken); },[igToken]);
  const [igData,setIgData] = useState(null); const [igLoading,setIgLoading] = useState(false); const [igErr,setIgErr] = useState(""); const [igAnalysis,setIgAnalysis] = useState(null); const [igALoading,setIgALoading] = useState(false); const [igSetup,setIgSetup] = useState(false);
  const [fbPosts,setFbPosts] = useState([]); const [fbErr,setFbErr] = useState(""); const [fbAnalysis,setFbAnalysis] = useState(null); const [fbALoading,setFbALoading] = useState(false);
  const [ytKey,setYtKey] = useState(()=>localStorage.getItem("bgb_yt_key")||"");
  const [ytChannelId,setYtChannelId] = useState(()=>localStorage.getItem("bgb_yt_channel_id")||"");
  useEffect(()=>{ localStorage.setItem("bgb_yt_key",ytKey); },[ytKey]);
  useEffect(()=>{ localStorage.setItem("bgb_yt_channel_id",ytChannelId); },[ytChannelId]);
  const [ytData,setYtData] = useState(null); const [ytLoading,setYtLoading] = useState(false); const [ytErr,setYtErr] = useState(""); const [ytAnalysis,setYtAnalysis] = useState(null); const [ytALoading,setYtALoading] = useState(false); const [ytSetup,setYtSetup] = useState(false);

  const pullIG = async () => {
    if(!igToken.trim()) return;
    setIgLoading(true); setIgErr(""); setIgData(null); setIgAnalysis(null);
    try { setIgData(await pullInstagramAnalytics(igToken)); }
    catch(e){ setIgErr(e.message); } finally { setIgLoading(false); }
  };
  const pullYT = async () => {
    if(!ytKey.trim()||!ytChannelId.trim()) return;
    setYtLoading(true); setYtErr(""); setYtData(null); setYtAnalysis(null);
    try { setYtData(await pullYouTubeAnalytics(ytKey,ytChannelId)); }
    catch(e){ setYtErr(e.message); } finally { setYtLoading(false); }
  };

  const parseExtensionData = async () => {
    if (!analyticsImport) return;
    setLiParsing(true); setLiParseErr(""); setLiData(null); setLiAnalysis(null);
    try {
      // Combine all three metric views into one prompt so Claude gets the full picture
      const sections = [
        analyticsImport.impressionsRaw && `=== TOP POSTS BY IMPRESSIONS ===\n${analyticsImport.impressionsRaw}`,
        analyticsImport.clicksRaw && `=== TOP POSTS BY CLICKS ===\n${analyticsImport.clicksRaw}`,
        analyticsImport.engagementRaw && `=== TOP POSTS BY ENGAGEMENT ===\n${analyticsImport.engagementRaw}`,
      ].filter(Boolean).join('\n\n') || analyticsImport.rawText || '';
      if (!sections) throw new Error("No data found in the import.");
      const raw = await callClaude(
        `You are a LinkedIn analytics parser. You will receive raw text scraped from LinkedIn Creator Analytics — it may contain three sections: impressions view, clicks view, and engagement view. Extract every post you can find and merge the metrics.

Return ONLY valid JSON:
{"posts":[{"date":"YYYY-MM-DD","hook":"opening line of post (max 80 chars, exact text)","mediaType":"text|image|video|carousel|document","impressions":0,"clicks":0,"reactions":0,"comments":0,"shares":0,"url":""}],"summary":{"totalPosts":0,"totalImpressions":0,"totalClicks":0,"vsLastWeek":"e.g. +12% impressions vs prior 7 days, or unknown"}}

Rules:
- Priority order when ranking: clicks first, then engagement (reactions+comments+shares), then impressions
- Extract the hook as the exact opening text of each post — preserve unconventional punctuation or style exactly as written
- Convert K/M suffixes: 1.2K=1200, 3.5M=3500000
- Use 0 for any metric not found
- Deduplicate posts that appear in multiple sections — merge their metrics
- Include up to 7 posts maximum, ranked by clicks desc`,
        `LinkedIn analytics data:\n\n${sections}`,
        3500
      );
      const data = JSON.parse(raw);
      if (!data.posts?.length) throw new Error("No posts found. Try pulling again — make sure the LinkedIn analytics page fully loaded before sending.");
      setLiData(data);
      setAnalyticsImport(null);
    } catch(e) { setLiParseErr("Parse failed: "+e.message); }
    finally { setLiParsing(false); }
  };

  const runAnalysis = async (data, setAnalysis, setALoading) => {
    setALoading(true);
    try { setAnalysis(await analyzeAnalytics(data,mind,formats)); }
    catch(e){ alert("Analysis failed: "+e.message); } finally { setALoading(false); }
  };

  const [mindAdded, setMindAdded] = useState({});
  const addToMind = (rec, recId) => {
    const body = rec.text || rec.body || rec.insight || rec.recommendation || JSON.stringify(rec);
    const category = rec.category || "frameworks";
    const entry = { id:Date.now(), title:"From "+category+" analysis", body, tags:["analytics","auto"] };
    const key = category==="contrarian"?"contrarian":category==="language"?"language":"frameworks";
    setMind(m=>({...m,[key]:[...m[key],entry]}));
    setMindAdded(a=>({...a,[recId||body]:true}));
  };

  const sigCol = {high:"ts",medium:"tg",low:"tr"};

  const AnalysisPanel = ({analysis, onAddToMind}) => analysis&&(
    <div className="rp mt16">
      <div className="ct" style={{fontSize:13}}>🤖 Agent Analysis — {analysis.platform}</div>
      {analysis.insights?.length>0&&<div className="mb12">{analysis.insights.map((ins,i)=><div key={i} className="li" style={{padding:"7px 0"}}><div style={{color:"var(--gold)",marginRight:8,flexShrink:0}}>→</div><div className="sm">{ins}</div></div>)}</div>}
      {analysis.themes?.length>0&&<div className="mb12"><div className="xs muted mb6">Top themes</div><div className="f g4x fw">{analysis.themes.map(t=><span key={t} className="tag tg">{t}</span>)}</div></div>}
      {analysis.hookPatterns?.length>0&&<div className="mb12"><div className="xs muted mb6">Hook patterns that worked</div>{analysis.hookPatterns.map((h,i)=><div key={i} className="sm mb4">· {h}</div>)}</div>}
      {analysis.bestPostingTime&&<div className="mb12"><div className="xs muted mb4">Best posting time</div><span className="tag tb">{analysis.bestPostingTime}</span></div>}
      {analysis.recommendations?.length>0&&<div><div className="xs muted mb8">Recommendations — add to Mind Bank</div>{analysis.recommendations.map((r,i)=>{
        const rid=analysis.platform+"-"+i; const done=mindAdded[rid||r.text];
        const isReplicate=r.type==="replicate"; const isAvoid=r.type==="avoid";
        const typeTag = isReplicate
          ? <span className="tag" style={{background:"rgba(74,103,65,0.15)",color:"var(--sage)",fontSize:10}}>✦ replicate</span>
          : isAvoid
          ? <span className="tag" style={{background:"rgba(180,80,60,0.12)",color:"var(--rust)",fontSize:10}}>✕ avoid</span>
          : <span className="tag" style={{background:"rgba(201,168,76,0.12)",color:"var(--gold)",fontSize:10}}>⚗ test</span>;
        return (
          <div key={i} className="f fac g8 mb8" style={{background:isReplicate?"rgba(74,103,65,0.06)":"",borderRadius:4,padding:"4px 6px"}}>
            <div style={{flex:1}}>
              <div className="sm">{r.text||r.body||r.insight}</div>
              <div className="f g6 mt4">{typeTag}<span className="tag ti" style={{fontSize:10}}>{r.category||"framework"}</span></div>
            </div>
            <button className={`btn bsm ${done?"bsa":isReplicate?"bg":"bp"}`} onClick={()=>{onAddToMind(r,rid);}} style={{flexShrink:0}}>
              {done?"✓ Added":isReplicate?"Try Again →":"+ Mind"}
            </button>
          </div>
        );
      })}</div>}
    </div>
  );

  const PostList = ({posts, sigKey, labelKey}) => {
    const sorted = [...(posts||[])].sort((a,b)=>b[sigKey]-a[sigKey]).slice(0,10);
    return sorted.map((p,i)=>(
      <div key={p.id} className="li">
        <div className="lidate xs muted">{i+1}</div>
        <div className="libody">
          <div className="lititle" style={{fontSize:12.5}}>{(p.caption||p.message||p.title||"").slice(0,100)}</div>
          <div className="limetrics mt4">
            <span className="mp hl"><strong>{p[sigKey]}</strong> {sigKey}</span>
            {p.impressions>0&&<span className="mp"><strong>{p.impressions?.toLocaleString()}</strong> imp</span>}
            {p.permalink&&<a href={p.permalink} target="_blank" rel="noreferrer" className="xs muted">↗</a>}
            {p.permalink_url&&<a href={p.permalink_url} target="_blank" rel="noreferrer" className="xs muted">↗</a>}
            {p.url&&<a href={p.url} target="_blank" rel="noreferrer" className="xs muted">↗</a>}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div>
      <div className="alert av mb20"><strong>Analytics Import</strong> — pull post data from each platform. The agent analyses what's working and surfaces insights you can add directly to Your Mind Bank.</div>

      {/* ── LINKEDIN ── */}
      <div className="card mb16">
        <div className="ct">🔵 LinkedIn <span className="xs muted" style={{fontWeight:400}}>Creator Analytics</span>
          {liData&&<span className="tag tb mla">{liData.summary.totalPosts} posts imported</span>}
        </div>

        {/* Extension data arrived */}
        {analyticsImport?.platform==="LinkedIn"&&!liData&&(
          <div className="alert av mb12" style={{borderColor:"rgba(201,168,76,0.5)"}}>
            <div className="f fac g8">
              <div style={{flex:1}}><strong>Data received from Chrome extension</strong> — {Math.round((analyticsImport.rawText?.length||0)/1000)}K chars captured from LinkedIn analytics page.</div>
              <button className="btn bp bsm" disabled={liParsing} onClick={parseExtensionData}>{liParsing?<><span className="spin"/> Parsing...</>:"Extract Posts →"}</button>
            </div>
          </div>
        )}
        {liParseErr&&<div className="alert ar mb12">{liParseErr}</div>}

        <div className="alert ag mb12" style={{fontSize:12}}>
          <strong>Option A — Chrome Extension (recommended):</strong> Open the BGB extension → Pull LinkedIn → Send to BGB App → click "Extract Posts" above.<br/>
          <strong>Option B — CSV upload:</strong> LinkedIn → Profile → Analytics → Content tab → Export → upload below.
        </div>
        {liErr&&<div className="alert ar mb12">{liErr}</div>}
        <div className="fg">
          <label className="lbl">Upload LinkedIn Analytics CSV</label>
          <input type="file" accept=".csv" style={{padding:"8px 0",fontSize:13,color:"var(--ink)"}} onChange={e=>{
            const file=e.target.files[0]; if(!file) return;
            setLiErr(""); setLiData(null); setLiAnalysis(null);
            const reader=new FileReader();
            reader.onload=ev=>{
              try { const data=parseLinkedInAnalytics(ev.target.result); if(!data.posts.length) throw new Error("No posts found in CSV."); setLiData(data); }
              catch(err){ setLiErr("Parse failed: "+err.message); }
            };
            reader.readAsText(file);
          }}/>
        </div>
        {liData&&<>
          <div className="g4 mb16">
            <div className="sc gold"><div className="sl">Posts</div><div className="sv">{liData.summary.totalPosts}</div></div>
            <div className="sc sage"><div className="sl">Total Impressions</div><div className="sv">{liData.summary.totalImpressions.toLocaleString()}</div></div>
            <div className="sc rust"><div className="sl">Total Clicks</div><div className="sv">{liData.summary.totalClicks.toLocaleString()}</div></div>
            <div className="sc violet"><div className="sl">Avg CTR</div><div className="sv">{liData.summary.avgCTR}</div></div>
          </div>
          <div className="ct" style={{fontSize:13}}>Top 10 by Impressions</div>
          {[...liData.posts].sort((a,b)=>b.impressions-a.impressions).slice(0,10).map((p,i)=>(
            <div key={p.id} className="li">
              <div className="lidate xs muted">{p.date.slice(0,10)}</div>
              <div className="libody">
                <div className="limetrics mt4">
                  <span className="mp hl"><strong>{p.impressions.toLocaleString()}</strong> imp</span>
                  <span className="mp"><strong>{p.clicks}</strong> clicks</span>
                  <span className="mp"><strong>{p.ctr}</strong> CTR</span>
                  <span className="mp"><strong>{p.likes}</strong> likes</span>
                  {p.url&&<a href={p.url} target="_blank" rel="noreferrer" className="xs muted">↗</a>}
                </div>
              </div>
            </div>
          ))}
          <div className="mt12">
            <button className="btn bp" onClick={()=>runAnalysis({platform:"LinkedIn",...liData},setLiAnalysis,setLiALoading)} disabled={liALoading}>{liALoading?<><span className="spin"/> Analysing...</>:"Run Analysis →"}</button>
          </div>
          <AnalysisPanel analysis={liAnalysis} onAddToMind={addToMind}/>
        </>}
      </div>

      {/* ── INSTAGRAM ── */}
      <div className="card mb16">
        <div className="ct">📸 Instagram <span className="xs muted" style={{fontWeight:400}}>Graph API</span>
          {igData&&<span className="tag ts mla">Connected — @{igData.username}</span>}
        </div>
        <button className="btn bgh bsm mb10" onClick={()=>setIgSetup(s=>!s)} style={{fontSize:11}}>{igSetup?"▲ Hide setup":"▼ How to get your access token"}</button>
        {igSetup&&<div className="alert ag mb12" style={{fontSize:12}}>
          <strong>Setup steps:</strong><br/>
          1. Go to <strong>developers.facebook.com</strong> → My Apps → Create App → choose Consumer<br/>
          2. Add the <strong>Instagram Basic Display</strong> product<br/>
          3. Under Test Users, connect your Instagram account<br/>
          4. Open <strong>Graph API Explorer</strong> → select your app → generate a User Token with <code>instagram_basic</code> + <code>instagram_manage_insights</code> scopes<br/>
          5. Click "Get Long-Lived Token" → paste it below
        </div>}
        <div className="f fac g8 mb12">
          <input type="password" className="inp" style={{flex:1}} placeholder="Access token (paste from Graph API Explorer)" value={igToken} onChange={e=>setIgToken(e.target.value)}/>
          <button className="btn bp" onClick={pullIG} disabled={igLoading||!igToken.trim()}>{igLoading?<><span className="spin"/> Pulling...</>:"Pull Instagram →"}</button>
        </div>
        {igErr&&<div className="alert ar mb12">{igErr}</div>}
        {igData&&<>
          <div className="g4 mb16">
            <div className="sc gold"><div className="sl">Posts (90d)</div><div className="sv">{igData.summary.totalPosts}</div></div>
            <div className="sc sage"><div className="sl">Total Saves</div><div className="sv">{igData.summary.totalSaves}</div></div>
            <div className="sc rust"><div className="sl">Avg Saves</div><div className="sv">{igData.summary.avgSaved}</div></div>
            <div className="sc violet"><div className="sl">Impressions</div><div className="sv">{igData.summary.totalImpressions.toLocaleString()}</div></div>
          </div>
          <div className="ct" style={{fontSize:13}}>Top 10 by Saves</div>
          <PostList posts={igData.posts} sigKey="saved" labelKey="saved"/>
          <div className="mt12">
            <button className="btn bp" onClick={()=>runAnalysis(igData,setIgAnalysis,setIgALoading)} disabled={igALoading}>{igALoading?<><span className="spin"/> Analysing...</>:"Run Analysis →"}</button>
          </div>
          <AnalysisPanel analysis={igAnalysis} onAddToMind={addToMind}/>
        </>}
      </div>

      {/* ── FACEBOOK HISTORY ── */}
      <div className="card mb16">
        <div className="ct">📘 Facebook Post History <span className="xs muted" style={{fontWeight:400}}>Data Export</span>
          {fbPosts.length>0&&<span className="tag tb mla">{fbPosts.length} posts imported</span>}
        </div>
        <div className="alert ag mb12" style={{fontSize:12}}>
          <strong>How to export:</strong> Facebook → Settings → Your Facebook Information → Download Your Information → tick <strong>Posts only</strong> → Format: <strong>JSON</strong> → Request Download. Extract the zip and upload <code>posts/your_posts_1.json</code> below.
        </div>
        {fbErr&&<div className="alert ar mb12">{fbErr}</div>}
        <div className="fg">
          <label className="lbl">Upload your_posts_1.json</label>
          <input type="file" accept=".json" style={{padding:"8px 0",fontSize:13,color:"var(--ink)"}} onChange={e=>{
            const file=e.target.files[0]; if(!file) return;
            setFbErr(""); setFbPosts([]); setFbAnalysis(null);
            const reader=new FileReader();
            reader.onload=ev=>{
              try { const posts=parseFacebookExport(ev.target.result); if(!posts.length) throw new Error("No text posts found — make sure you selected JSON format."); setFbPosts(posts); }
              catch(err){ setFbErr("Parse failed: "+err.message); }
            };
            reader.readAsText(file);
          }}/>
        </div>
        {fbPosts.length>0&&<>
          <div className="g3 mb16">
            <div className="sc gold"><div className="sl">Posts</div><div className="sv">{fbPosts.length}</div></div>
            <div className="sc sage"><div className="sl">Oldest</div><div className="sv" style={{fontSize:16}}>{fbPosts[fbPosts.length-1]?.date}</div></div>
            <div className="sc rust"><div className="sl">Most Recent</div><div className="sv" style={{fontSize:16}}>{fbPosts[0]?.date}</div></div>
          </div>
          <div className="ct" style={{fontSize:13}}>Recent posts</div>
          {fbPosts.slice(0,5).map((p,i)=>(
            <div key={p.id} className="li">
              <div className="lidate xs muted">{p.date.slice(5)}</div>
              <div className="libody"><div className="liprev">{p.content.slice(0,120)}</div></div>
            </div>
          ))}
          <div className="mt12">
            <button className="btn bp" onClick={async()=>{setFbALoading(true);try{setFbAnalysis(await analyzeFacebookHistory(fbPosts,mind));}catch(e){setFbErr("Analysis failed: "+e.message);}finally{setFbALoading(false);}}} disabled={fbALoading}>{fbALoading?<><span className="spin"/> Analysing...</>:"Run Analysis →"}</button>
          </div>
          {fbAnalysis&&<div className="rp mt16">
            <div className="ct" style={{fontSize:13}}>🤖 Facebook History Analysis</div>
            {fbAnalysis.topThemes?.length>0&&<div className="mb12"><div className="xs muted mb6">Top themes</div><div className="f g4x fw">{fbAnalysis.topThemes.map(t=><span key={t} className="tag tg">{t}</span>)}</div></div>}
            {fbAnalysis.hookPatterns?.length>0&&<div className="mb12"><div className="xs muted mb6">Hook patterns that worked</div>{fbAnalysis.hookPatterns.map((h,i)=><div key={i} className="sm mb4">· {h}</div>)}</div>}
            {fbAnalysis.styleInsights?.length>0&&<div className="mb12"><div className="xs muted mb6">Style insights</div>{fbAnalysis.styleInsights.map((s,i)=><div key={i} className="sm mb4">· {s}</div>)}</div>}
            {fbAnalysis.underusedAngles?.length>0&&<div className="mb12"><div className="xs muted mb6">Underused angles</div>{fbAnalysis.underusedAngles.map((u,i)=><div key={i} className="sm mb4">· {u}</div>)}</div>}
            {fbAnalysis.recommendations?.length>0&&<div><div className="xs muted mb8">Recommendations — add to Mind Bank</div>{fbAnalysis.recommendations.map((r,i)=>{
              const rid="fb-"+i; const done=mindAdded[rid||r.text];
              return (
                <div key={i} className="f fac g8 mb8">
                  <div className="sm" style={{flex:1}}>{r.text||r.body||r.insight||r.recommendation}</div>
                  <span className="tag ti">{r.category||"framework"}</span>
                  <button className={`btn bsm ${done?"bsa":"bp"}`} onClick={()=>addToMind(r,rid)}>{done?"✓ Added":"+ Mind"}</button>
                </div>
              );
            })}</div>}
          </div>}
        </>}
      </div>

      {/* ── YOUTUBE ── */}
      <div className="card mb16">
        <div className="ct">▶️ YouTube <span className="xs muted" style={{fontWeight:400}}>Data API v3</span>
          {ytData&&<span className="tag tr mla">Connected — {ytData.summary.totalVideos} videos</span>}
        </div>
        <button className="btn bgh bsm mb10" onClick={()=>setYtSetup(s=>!s)} style={{fontSize:11}}>{ytSetup?"▲ Hide setup":"▼ How to get your API key"}</button>
        {ytSetup&&<div className="alert ag mb12" style={{fontSize:12}}>
          <strong>Setup steps:</strong><br/>
          1. Go to <strong>console.cloud.google.com</strong> → New Project → name it anything<br/>
          2. APIs & Services → Enable APIs → search <strong>YouTube Data API v3</strong> → Enable<br/>
          3. APIs & Services → Credentials → Create Credentials → <strong>API Key</strong> → copy it<br/>
          4. Your Channel ID: go to <strong>YouTube Studio</strong> → Settings → Channel → Advanced settings → copy the Channel ID (starts with UC…)
        </div>}
        <div className="f fac g8 mb8">
          <input type="password" className="inp" style={{flex:2}} placeholder="API Key (from Google Cloud Console)" value={ytKey} onChange={e=>setYtKey(e.target.value)}/>
          <input className="inp" style={{flex:1}} placeholder="Channel ID (UCxxxx...)" value={ytChannelId} onChange={e=>setYtChannelId(e.target.value)}/>
          <button className="btn bp" onClick={pullYT} disabled={ytLoading||!ytKey.trim()||!ytChannelId.trim()}>{ytLoading?<><span className="spin"/> Pulling...</>:"Pull YouTube →"}</button>
        </div>
        {ytErr&&<div className="alert ar mb12">{ytErr}</div>}
        {ytData&&<>
          <div className="g3 mb16">
            <div className="sc gold"><div className="sl">Videos</div><div className="sv">{ytData.summary.totalVideos}</div></div>
            <div className="sc sage"><div className="sl">Total Views</div><div className="sv">{ytData.summary.totalViews.toLocaleString()}</div></div>
            <div className="sc rust"><div className="sl">Avg Views</div><div className="sv">{ytData.summary.avgViews.toLocaleString()}</div></div>
          </div>
          <div className="ct" style={{fontSize:13}}>Top 10 by Views</div>
          <PostList posts={ytData.videos} sigKey="viewCount" labelKey="views"/>
          <div className="mt12">
            <button className="btn bp" onClick={()=>runAnalysis(ytData,setYtAnalysis,setYtALoading)} disabled={ytALoading}>{ytALoading?<><span className="spin"/> Analysing...</>:"Run Analysis →"}</button>
          </div>
          <AnalysisPanel analysis={ytAnalysis} onAddToMind={addToMind}/>
        </>}
      </div>
    </div>
  );
}

function GeneratePage({ mind, formats, assets, addToQueue, setPage, writingRules="" }) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [weekLoading, setWeekLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [weekDone, setWeekDone] = useState(false);

  const generate = async () => {
    setLoading(true); setErr(""); setResult(null);
    try { const r = await genPosts(raw, "", "", mind, formats, [], writingRules); setResult(r); }
    catch(e) { setErr("Generation failed: " + e.message); }
    finally { setLoading(false); }
  };

  const fillWeek = async () => {
    setWeekLoading(true); setErr(""); setWeekDone(false);
    try {
      const r = await genWeekPosts(mind, formats, writingRules);
      if (r.posts) {
        r.posts.forEach(p => addToQueue({content:p.content,hook:p.hook,platform:"LinkedIn",format:p.format}, {theme:p.theme,rationale:p.rationale}));
        setWeekDone(true);
        setTimeout(() => setPage("queue"), 1200);
      }
    } catch(e) { setErr("Fill My Week failed: " + e.message); }
    finally { setWeekLoading(false); }
  };

  return (
    <div>
      <div className="card mb16">
        <div className="ct">⊕ Generate
          <div className="cta">
            <button className="btn bv" onClick={fillWeek} disabled={weekLoading||weekDone}>
              {weekLoading?<><span className="spin"/> Generating 5 posts...</>:weekDone?"✓ Added to Queue":"Fill My Week →"}
            </button>
          </div>
        </div>
        <div className="fg">
          <label className="lbl">What's on your mind? <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>— optional. Leave blank and AI picks the best topic from your Mind Bank.</span></label>
          <textarea className="ta" style={{minHeight:150}} placeholder="Client conversation, rant, framework idea, observation... the messier the better. Or leave blank." value={raw} onChange={e=>setRaw(e.target.value)}/>
        </div>
        {assets.length>0&&<div className="fg">
          <label className="lbl">Or load from library</label>
          <select className="sel" onChange={e=>{const a=assets.find(a=>String(a.id)===e.target.value);if(a)setRaw(a.content||a.summary||"");}}>
            <option value="">Select asset...</option>
            {assets.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>}
        <button className="btn bp w100" style={{padding:"12px 16px",fontSize:14}} onClick={generate} disabled={loading}>
          {loading?<><span className="spin"/> Writing in Stephen's voice...</>:"Generate Post →"}
        </button>
      </div>
      {err&&<div className="alert ar">{err}</div>}
      {result&&(
        <div>
          <div className="alert as2 mb16">
            <strong>{result.chosenTheme||"Theme selected"}</strong> · {result.chosenFormat||"Format auto-picked"}
            {result.insights?.[0]&&<div style={{marginTop:6,fontSize:12,opacity:0.8}}>{result.insights[0]}</div>}
          </div>
          {result.variations?.map((v,i)=>(
            <div key={i} className="card mb12">
              <div className="f fac g8 mb10">
                <span className="tag tb">{v.platform}</span>
                {v.format&&<span className="tag ti">{v.format}</span>}
                <div className="mla f g8">
                  <CopyBtn text={v.content}/>
                  <button className="btn bg bsm" onClick={()=>{addToQueue(v,{theme:result.chosenTheme,format:result.chosenFormat});setPage("queue");}}>Add to Queue →</button>
                </div>
              </div>
              {v.hook&&<div style={{fontWeight:600,fontSize:13.5,marginBottom:8}}>{v.hook}</div>}
              <div className="vt">{v.content}</div>
            </div>
          ))}
          {result.suggestedABTest&&(
            <div className="card" style={{borderColor:"rgba(92,75,138,0.35)"}}>
              <div className="ct">⚗️ Suggested A/B Variant</div>
              <div className="alert av mb12"><strong>Hypothesis:</strong> {result.suggestedABTest.hypothesis}</div>
              {result.suggestedABTest.variantHook&&<div style={{fontWeight:600,marginBottom:8}}>{result.suggestedABTest.variantHook}</div>}
              <div className="vt mb12">{result.suggestedABTest.variantContent}</div>
              <div className="f g8">
                <CopyBtn text={result.suggestedABTest.variantContent}/>
                <button className="btn bv bsm" onClick={()=>{addToQueue({content:result.suggestedABTest.variantContent,hook:result.suggestedABTest.variantHook,platform:"LinkedIn",format:result.chosenFormat},{theme:result.chosenTheme});setPage("queue");}}>Add to Queue →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentQueuePage({ contentQueue, setContentQueue, postFromQueue }) {
  const [edits, setEdits] = useState(()=>
    contentQueue.reduce((acc,item)=>({...acc,[item.id]:item.content}),[])
  );
  const [ctaEdits, setCtaEdits] = useState(()=>
    contentQueue.reduce((acc,item)=>({...acc,[item.id]:item.cta||""}),[])
  );
  const [expanded, setExpanded] = useState(null);

  useEffect(()=>{
    setEdits(prev=>{
      const next={...prev};
      contentQueue.forEach(item=>{ if(next[item.id]===undefined) next[item.id]=item.content; });
      return next;
    });
    setCtaEdits(prev=>{
      const next={...prev};
      contentQueue.forEach(item=>{ if(next[item.id]===undefined) next[item.id]=item.cta||""; });
      return next;
    });
  },[contentQueue]);

  const saveEdits = (item) => {
    setContentQueue(q => q.map(qi => qi.id !== item.id ? qi : {
      ...qi,
      content: edits[item.id] ?? qi.content,
      cta: ctaEdits[item.id] ?? qi.cta ?? "",
      hook: (edits[item.id] ?? qi.content).split('\n')[0].slice(0, 120),
    }));
    setExpanded(null);
  };

  const goLive = (item) => {
    // Merge edited CTA back into content before posting
    const editedContent = edits[item.id] ?? item.content;
    const editedCta = ctaEdits[item.id] ?? item.cta ?? "";
    const merged = editedCta
      ? editedContent.replace(/bgb\.coach\/offer[^\s]*/g, editedCta).replace(/\n*$/, "\n\n" + editedCta).replace(/(\n\n[^\n]+)\n\n\1$/, "$1")
      : editedContent;
    postFromQueue({...item, cta: editedCta}, merged);
  };

  if (contentQueue.length === 0) {
    return (
      <div className="card" style={{textAlign:"center",padding:56}}>
        <div style={{fontSize:34,marginBottom:12}}>▦</div>
        <div className="serif" style={{fontSize:19,marginBottom:6}}>Queue is empty</div>
        <div className="muted sm">Generate posts and add them here. When you're ready to go live, hit Go Live.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="alert ag mb16">
        <strong>{contentQueue.length} post{contentQueue.length!==1?"s":""} queued.</strong> Click any row to edit. Hit Go Live → content copies to clipboard with the tracked link injected.
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table>
          <thead>
            <tr>
              <th style={{width:"40%"}}>Hook</th>
              <th>Platform</th>
              <th>Format</th>
              <th>Theme</th>
              <th>Added</th>
              <th style={{width:140}}></th>
            </tr>
          </thead>
          <tbody>
            {contentQueue.map(item=>{
              const isOpen = expanded === item.id;
              return (
                <React.Fragment key={item.id}>
                  {/* compact row */}
                  <tr
                    onClick={()=>setExpanded(isOpen ? null : item.id)}
                    style={{cursor:"pointer", background: isOpen ? "var(--cream)" : undefined}}
                  >
                    <td>
                      <div style={{fontWeight:600,fontSize:13,lineHeight:1.4}}>
                        {(item.hook||item.content||"").slice(0,90)}{((item.hook||item.content||"").length>90)?"…":""}
                      </div>
                    </td>
                    <td><span className="tag tb">{item.platform||"LinkedIn"}</span></td>
                    <td><span className="tag ti" style={{fontSize:10}}>{item.format||"—"}</span></td>
                    <td><span className="tag tg" style={{fontSize:10}}>{item.theme||"—"}</span></td>
                    <td className="xs muted">{new Date(item.addedAt).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}</td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div className="f g6" style={{justifyContent:"flex-end"}}>
                        <button className="btn bg bsm" onClick={()=>goLive(item)}>Go Live →</button>
                        <button className="btn bgh bsm" style={{color:"var(--rust)"}} onClick={()=>setContentQueue(q=>q.filter(qi=>qi.id!==item.id))}>✕</button>
                      </div>
                    </td>
                  </tr>
                  {/* expanded edit row */}
                  {isOpen&&(
                    <tr style={{background:"var(--cream)"}}>
                      <td colSpan={6} style={{padding:"16px 20px 20px"}}>
                        <div className="xs muted mb8" style={{textTransform:"uppercase",letterSpacing:1,fontFamily:"DM Mono,monospace"}}>Edit post</div>
                        <textarea
                          className="ta"
                          style={{minHeight:200,fontSize:13,lineHeight:1.75,marginBottom:12}}
                          value={edits[item.id]??item.content}
                          onChange={e=>setEdits(prev=>({...prev,[item.id]:e.target.value}))}
                          onClick={e=>e.stopPropagation()}
                        />
                        <div className="xs muted mb6" style={{textTransform:"uppercase",letterSpacing:1,fontFamily:"DM Mono,monospace",color:"var(--gold)"}}>CTA line</div>
                        <input
                          className="inp"
                          style={{marginBottom:14,borderColor:"var(--gold)",fontSize:13,fontFamily:"DM Mono,monospace"}}
                          value={ctaEdits[item.id]??item.cta??""}
                          onChange={e=>setCtaEdits(prev=>({...prev,[item.id]:e.target.value}))}
                          placeholder="bgb.coach/offer → ..."
                          onClick={e=>e.stopPropagation()}
                        />
                        {item.rationale&&<div className="xs muted mb12" style={{fontStyle:"italic"}}>Why now: {item.rationale}</div>}
                        <div className="f g8">
                          <button className="btn bp" onClick={()=>saveEdits(item)}>Save edits ↑</button>
                          <button className="btn bg" onClick={()=>goLive(item)}>Go Live →</button>
                          <button className="btn bgh bsm mla" style={{color:"var(--rust)"}} onClick={()=>setContentQueue(q=>q.filter(qi=>qi.id!==item.id))}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function WritingRulesPage({ rules, setRules }) {
  const [draft, setDraft] = useState(rules);
  const [saved, setSaved] = useState(false);
  const save = () => { setRules(draft); setSaved(true); setTimeout(()=>setSaved(false), 2000); };
  const reset = () => { setDraft(SEED_WRITING_RULES); };
  return (
    <div>
      <div className="alert ar mb20">
        <strong>Writing Rules</strong> — injected into every generation call. The AI reads this before writing a single word. Be specific — vague rules get ignored. The more precise, the better the output.
      </div>
      <div className="card">
        <div className="ct">✍️ Your Writing Rules
          <div className="cta">
            <button className="btn bo bsm" onClick={reset}>Reset to defaults</button>
            <button className={`btn bsm ${saved?"bsa":"bp"}`} onClick={save}>{saved?"✓ Saved — AI will use these now":"Save Rules →"}</button>
          </div>
        </div>
        <div className="alert ag mb16" style={{fontSize:12}}>
          Write in plain English. Use NEVER DO THIS and ALWAYS DO THIS sections. Be as specific as possible — name exact phrases, patterns, and structures. These rules override everything else.
        </div>
        <textarea
          className="ta"
          style={{minHeight:520, fontFamily:"'DM Mono',monospace", fontSize:12.5, lineHeight:1.8}}
          value={draft}
          onChange={e=>setDraft(e.target.value)}
        />
        <div className="f fac g12 mt16">
          <button className={`btn ${saved?"bsa":"bp"}`} onClick={save}>{saved?"✓ Saved":"Save Rules →"}</button>
          <span className="xs muted">These rules are injected into every Generate, Fill My Week, and Weekly Report call.</span>
        </div>
      </div>
      <div className="card mt16">
        <div className="ct">💡 Tips for writing effective rules</div>
        {[
          ["Be specific, not vague","❌ 'Don't be boring' → ✓ 'Never open with a rhetorical question'"],
          ["Name exact phrases to avoid","❌ 'Avoid jargon' → ✓ 'Never use: leverage, unlock, game-changer, crush it'"],
          ["Describe structure, not just tone","✓ 'End every post with a 1–2 line standalone punch. Never a question.'"],
          ["Add rules as you spot bad habits","When the AI writes something that feels off, add a rule that prevents it"],
        ].map(([title,desc],i)=>(
          <div key={i} className="li">
            <div style={{width:20,flexShrink:0,color:"var(--gold)",fontWeight:700}}>→</div>
            <div className="libody"><div className="lititle" style={{fontSize:13}}>{title}</div><div className="xs muted mt4">{desc}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const NAV = [
  {sec:"Core Loop"},
  {id:"dashboard",label:"Dashboard",icon:"◈"},
  {id:"generate",label:"Generate",icon:"⊕"},
  {id:"queue",label:"Content Queue",icon:"▦",badge:"queue"},
  {id:"tracking",label:"Live Posts",icon:"◉"},
  {sec:"Intelligence"},
  {id:"analytics",label:"Analytics Import",icon:"📥",badge:"analytics"},
  {id:"review",label:"Review Queue",icon:"◐",badge:"review"},
  {id:"report",label:"Weekly Report",icon:"📊"},
  {id:"dna",label:"Content DNA",icon:"🧬"},
  {sec:"Knowledge Banks"},
  {id:"mind",label:"Your Mind",icon:"🧠"},
  {id:"whatworks",label:"What Works",icon:"✦"},
  {id:"rules",label:"Writing Rules",icon:"🚫"},
  {id:"bestpractice",label:"Best Practices",icon:"🌐"},
  {sec:"Library"},
  {id:"input",label:"Content Input",icon:"✍️"},
];

const TITLES = {dashboard:"Dashboard",generate:"Generate Posts",queue:"Content Queue",tracking:"Live Posts",analytics:"Analytics Import",dna:"Content DNA",review:"7-Day Review Queue",report:"Weekly Agent Report",mind:"Your Mind Bank",whatworks:"What Works Bank",rules:"Writing Rules",bestpractice:"Best Practice Knowledge Bank",input:"Content Library"};

const AUTH_KEY = "bgb_auth_v1";
const CORRECT = import.meta.env.VITE_APP_PASSWORD;

function PasswordGate({ onAuth }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(false);
  const submit = () => {
    if (val === CORRECT) {
      localStorage.setItem(AUTH_KEY, "1");
      onAuth();
    } else {
      setErr(true); setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };
  return (
    <>
      <style>{STYLE}</style>
      <style>{`
        @keyframes sh { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        .shake { animation: sh 0.45s ease; }
      `}</style>
      <div style={{minHeight:"100vh",background:"var(--cream)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:340,textAlign:"center"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"var(--ink)",marginBottom:6}}>BGB</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:3,textTransform:"uppercase",color:"var(--ink60)",marginBottom:36}}>Content Intelligence</div>
          <div className={`card ${shake?"shake":""}`} style={{padding:28}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,marginBottom:18,color:"var(--ink)"}}>Enter password to continue</div>
            <input
              className="inp"
              type="password"
              placeholder="Password"
              value={val}
              autoFocus
              onChange={e=>{setVal(e.target.value);setErr(false);}}
              onKeyDown={e=>e.key==="Enter"&&submit()}
              style={err?{borderColor:"var(--rust)"}:{}}
            />
            {err&&<div style={{color:"var(--rust)",fontSize:11,fontFamily:"DM Mono,monospace",marginTop:6}}>Incorrect password</div>}
            <button className="btn bp w100" style={{marginTop:14,padding:"10px 16px"}} onClick={submit}>Continue →</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(()=>{
    if (!CORRECT) return true; // no password set — open access
    return localStorage.getItem(AUTH_KEY) === "1";
  });
  const [page,setPage] = useState("dashboard");

  // ── Persisted state — survives page refresh ──────────────────────────────
  const lsGet = (key, fallback) => { try { const s=localStorage.getItem(key); return s?JSON.parse(s):fallback; } catch{ return fallback; } };
  const [posts,setPosts] = useState(()=>lsGet("bgb_posts",[]));
  const [mind,setMind] = useState(()=>lsGet("bgb_mind",SEED_MIND));
  const [writingRules,setWritingRules] = useState(()=>lsGet("bgb_rules",SEED_WRITING_RULES));
  const [formats,setFormats] = useState(()=>lsGet("bgb_formats",SEED_FORMATS));
  const [reviewQueue,setReviewQueue] = useState(()=>lsGet("bgb_review",[]));
  const [bestPractice,setBestPractice] = useState(()=>lsGet("bgb_bestpractice",SEED_BESTPRACTICE));
  useEffect(()=>{ localStorage.setItem("bgb_posts",JSON.stringify(posts)); },[posts]);
  useEffect(()=>{ localStorage.setItem("bgb_mind",JSON.stringify(mind)); },[mind]);
  useEffect(()=>{ localStorage.setItem("bgb_rules",JSON.stringify(writingRules)); },[writingRules]);
  useEffect(()=>{ localStorage.setItem("bgb_formats",JSON.stringify(formats)); },[formats]);
  useEffect(()=>{ localStorage.setItem("bgb_review",JSON.stringify(reviewQueue)); },[reviewQueue]);
  useEffect(()=>{ localStorage.setItem("bgb_bestpractice",JSON.stringify(bestPractice)); },[bestPractice]);
  // ─────────────────────────────────────────────────────────────────────────

  const [assets,setAssets] = useState(()=>lsGet("bgb_assets",[]));
  useEffect(()=>{ localStorage.setItem("bgb_assets",JSON.stringify(assets)); },[assets]);
  const [analyticsImport,setAnalyticsImport] = useState(null);
  const [instagramImport,setInstagramImport] = useState(null);
  const [contentQueue,setContentQueue] = useState(()=>lsGet("bgb_queue",[]));
  useEffect(()=>{ localStorage.setItem("bgb_queue",JSON.stringify(contentQueue)); },[contentQueue]);
  useEffect(()=>{
    const handler = e => { setAnalyticsImport(e.detail); setPage("analytics"); };
    window.addEventListener("bgb-analytics-import", handler);
    return ()=>window.removeEventListener("bgb-analytics-import", handler);
  },[]);
  const pending = reviewQueue.filter(r=>r.status==="ready").length;
  const queueCount = contentQueue.length;

  const addToQueue = (variation, meta={}) => {
    setContentQueue(q=>[...q,{
      id: Date.now()+Math.random(),
      content: variation.content,
      hook: variation.hook,
      cta: variation.cta||"",
      platform: variation.platform||"LinkedIn",
      format: variation.format||meta.format||"",
      theme: meta.theme||"",
      rationale: meta.rationale||"",
      addedAt: new Date().toISOString(),
    }]);
  };

  const postFromQueue = (item, editedText) => {
    const postId = Date.now();
    const trackedLink = `bgb.coach/offer?ref=${postId}`;
    const baseText = (editedText !== undefined ? editedText : item.content) || item.content;
    // Inject ?ref into any bare bgb.coach/offer links in the content
    const finalContent = baseText.replace(/bgb\.coach\/offer(?!\?ref=)/g, trackedLink);
    navigator.clipboard.writeText(finalContent).catch(()=>{});
    const newPost = {
      id: postId,
      title: item.hook?.slice(0,60)||finalContent.split('\n')[0].slice(0,60),
      date: new Date().toISOString().slice(0,10),
      platform: item.platform,
      status: "published",
      content: finalContent,
      theme: item.theme,
      format: item.format,
      cta: item.cta||"",
      impressions: 0, engagement: 0, docViews: 0, calls: 0,
      clicks: 0, reactions: 0, comments: 0, reach: 0,
      saves: 0, views: 0, watchTime: 0, likes: 0,
      trackedLink,
      url: "", isTest: false, testGroup: null, proven: false, daysLive: 0,
    };
    setPosts(p=>[newPost,...p]);
    setContentQueue(q=>q.filter(qi=>qi.id!==item.id));
    const due = new Date(); due.setDate(due.getDate()+7);
    setReviewQueue(rq=>[...rq,{
      id: Date.now()+1,
      postId: newPost.id,
      postTitle: newPost.title,
      dueDate: due.toISOString().slice(0,10),
      status: "ready",
      platform: newPost.platform,
      docViews: 0, calls: 0, impressions: 0,
      format: newPost.format,
      theme: newPost.theme,
      testGroup: null,
      aiProposal: null,
    }]);
  };

  if (!authed) return <PasswordGate onAuth={()=>setAuthed(true)}/>;

  return (
    <>
      <style>{STYLE}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="sb-logo"><h1>BGB</h1><p>Content Intelligence</p></div>
          <nav className="sb-nav">
            {NAV.map((n,i)=>n.sec
              ?<div key={i} className="sb-sec">{n.sec}</div>
              :<div key={n.id} className={`sb-item ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
                <span className="ni">{n.icon}</span>{n.label}
                {n.badge==="review"&&pending>0&&<span className="sb-badge">{pending}</span>}
                {n.badge==="queue"&&queueCount>0&&<span className="sb-badge">{queueCount}</span>}
                {n.badge==="analytics"&&(analyticsImport||instagramImport)&&<span className="sb-badge">NEW</span>}
              </div>
            )}
          </nav>
          <div className="sb-foot">Generate → Queue → Post<br/>→ Track → Review → Repeat</div>
        </aside>
        <main className="main">
          <div className="topbar">
            <div className="tb-title">{TITLES[page]||page}</div>
            <div className="tb-meta">
              {new Date().toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}<br/>
              {formats.filter(f=>f.status==="proven").length} proven · {formats.filter(f=>f.status==="testing").length} testing · {mind.frameworks.length+mind.clientStories.length+mind.contrarian.length+mind.language.length} mind entries
            </div>
          </div>
          <div className="pg">
            {page==="dashboard"&&<Dashboard posts={posts} formats={formats} reviewQueue={reviewQueue} contentQueue={contentQueue} setPage={setPage} postFromQueue={postFromQueue}/>}
            {page==="generate"&&<GeneratePage mind={mind} formats={formats} bestPractice={bestPractice} assets={assets} addToQueue={addToQueue} setPage={setPage} writingRules={writingRules}/>}
            {page==="queue"&&<ContentQueuePage contentQueue={contentQueue} setContentQueue={setContentQueue} postFromQueue={postFromQueue}/>}
            {page==="engine"&&<GeneratePage mind={mind} formats={formats} bestPractice={bestPractice} assets={assets} addToQueue={addToQueue} setPage={setPage} writingRules={writingRules}/>}
            {page==="tracking"&&<Tracking posts={posts} setPosts={setPosts}/>}
            {page==="analytics"&&<AnalyticsPage mind={mind} setMind={setMind} formats={formats} analyticsImport={analyticsImport} setAnalyticsImport={setAnalyticsImport}/>}
            {page==="dna"&&<ContentDNAPage mind={mind} setMind={setMind} formats={formats} setFormats={setFormats}/>}
            {page==="review"&&<ReviewQueue posts={posts} setPosts={setPosts} formats={formats} setFormats={setFormats} reviewQueue={reviewQueue} setReviewQueue={setReviewQueue} mind={mind}/>}
            {page==="report"&&<WeeklyReport posts={posts} formats={formats} mind={mind}/>}
            {page==="mind"&&<MyMind mind={mind} setMind={setMind}/>}
            {page==="whatworks"&&<WhatWorksBank formats={formats} setFormats={setFormats} mind={mind}/>}
            {page==="rules"&&<WritingRulesPage rules={writingRules} setRules={setWritingRules}/>}
            {page==="bestpractice"&&<BestPracticeBank bestPractice={bestPractice} setBestPractice={setBestPractice} mind={mind}/>}
            {page==="input"&&<ContentLibrary assets={assets} setAssets={setAssets}/>}
          </div>
        </main>
      </div>
    </>
  );
}
