import { useState, useEffect } from "react";

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
const SEED_POSTS = [
  { id:1, title:"The trap most $2M business owners don't see", date:"2025-06-03", platform:"LinkedIn", status:"published", content:"Your business grew because you were good at the work.\n\nNow you're trapped in the work because you're too good at it.\n\nI call it the Founder Trap.\n\nYou built the thing. You ARE the thing.\n\nAnd until you install someone to run it day-to-day, you will always be the bottleneck.\n\nThe fix isn't working harder. It's not another system.\n\nIt's a GM.\n\nSomeone who runs the business so you can build it.\n\nThat's the move.", theme:"Delegation Ladder", format:"Problem → Insight → CTA", impressions:4200, engagement:187, docViews:23, calls:2, trackedLink:"bgb.co/p1", url:"https://linkedin.com/post/1", isTest:false, testGroup:null, proven:false, daysLive:23 },
  { id:2, title:"Why hiring a GM feels wrong (and why that's the point)", date:"2025-05-28", platform:"LinkedIn", status:"published", content:"Every founder I work with says the same thing before they install a GM:\n\n'I'm worried they won't do it the way I do.'\n\nYou're right. They won't.\n\nThey'll do some things worse. A few things better. And the business will survive.\n\nBecause here's what nobody tells you: the business doesn't need you everywhere.\n\nIt needs you to be intentional.\n\nA GM creates space for that.\n\nThe discomfort is the point. Lean into it.", theme:"GM Install", format:"Contrarian Take", impressions:2800, engagement:94, docViews:31, calls:3, trackedLink:"bgb.co/p2", url:"https://linkedin.com/post/2", isTest:false, testGroup:null, proven:true, daysLive:29 },
  { id:3, title:"The $500K mistake hidden in your org chart", date:"2025-05-21", platform:"Instagram", status:"published", content:"Most owners have no idea what their time is actually worth.\n\nSo they protect the wrong things.\n\nThey guard tasks worth $50/hour and wonder why they can't grow.\n\nDraw your org chart.\n\nNow put your name everywhere it appears.\n\nThat's the problem.\n\nEvery box with your name is a hire or a delegate.\n\nDo the maths.", theme:"Owner Freedom", format:"Framework Drop", impressions:1900, engagement:211, docViews:8, calls:0, trackedLink:"bgb.co/p3", url:"https://instagram.com/p/xyz", isTest:true, testGroup:"A", proven:false, daysLive:36 },
  { id:4, title:"What 18 months watching founders taught me", date:"2025-06-10", platform:"LinkedIn", status:"published", content:"The ones who scale share one trait.\n\nIt's not drive. Not strategy. Not capital.\n\nIt's the willingness to stop being the best person in the room.\n\nEvery founder who hit $5M+ in my world did one thing:\n\nThey hired someone better than them at running the day-to-day.\n\nThen they went back to doing what only they can do.\n\nThat's the move.", theme:"Delegation Ladder", format:"Observation + Principle", impressions:3100, engagement:142, docViews:19, calls:1, trackedLink:"bgb.co/p4", url:"https://linkedin.com/post/4", isTest:true, testGroup:"B", proven:false, daysLive:16 },
];

const SEED_FORMATS = [
  { id:1, name:"Contrarian Take", description:"Open with the conventional wisdom, flip it, end with the earned conclusion.", example:"Everyone says X. Here's why that's wrong...", status:"proven", avgDocViews:28, avgCalls:2.5, postsUsed:4, notes:"Works best when Stephen has a strong personal opinion. LinkedIn." },
  { id:2, name:"Problem → Insight → CTA", description:"Name the pain precisely, reveal the non-obvious cause, point to the offer doc.", example:"You're working 60hr weeks. Not because you're inefficient...", status:"proven", avgDocViews:21, avgCalls:1.8, postsUsed:6, notes:"Solid workhorse. Converts consistently across themes." },
  { id:3, name:"Framework Drop", description:"Present a named mental model. Make it feel proprietary.", example:"The Delegation Ladder has 5 rungs. Most owners are stuck on rung 2...", status:"testing", avgDocViews:9, avgCalls:0.4, postsUsed:2, notes:"Testing on Instagram. High engagement, low conversion so far." },
  { id:4, name:"Observation + Principle", description:"Field observation → universal principle.", example:"After 18 months watching $2M–$5M owners...", status:"testing", avgDocViews:17, avgCalls:0.9, postsUsed:2, notes:"Promising. Second test running." },
  { id:5, name:"Client Story Arc", description:"Before state → intervention → result. Specific numbers required.", example:"Sarah ran a $3.2M design firm. She was working Sundays...", status:"proposed", avgDocViews:0, avgCalls:0, postsUsed:0, notes:"AI proposed. High conversion in similar niches. Not yet tested." },
];

const SEED_MIND = {
  frameworks: [
    { id:1, title:"The Delegation Ladder", body:"5 rungs: Do → Delegate with instruction → Delegate with oversight → Delegate with check-in → Full autonomy. Most owners are stuck at rung 2 because they've never documented the job properly.", tags:["core","GM install"] },
    { id:2, title:"Owner ↔ Operator Split", body:"The owner's job is to build the business. The operator's job is to run it. When one person does both, neither gets done properly. The GM Install separates these permanently.", tags:["core","positioning"] },
    { id:3, title:"The $5M Ceiling", body:"Most founders hit an invisible ceiling at $3M–$5M because they're both visionary and integrator. Installing a GM breaks through without needing new strategy.", tags:["growth","targeting"] },
  ],
  clientStories: [
    { id:1, title:"Sarah — Design firm, 90-day GM install", body:"Sarah ran a $3.2M design firm solo. Worked every Sunday. Installed a GM in 90 days. Within 60 days: reclaimed 3 days/week, revenue up 11% from better client onboarding run by GM.", tags:["result","quick win"] },
    { id:2, title:"James — The 'they won't do it my way' objection", body:"James resisted for 2 years. We documented his top 12 decisions in one afternoon. His GM has run the business for 8 months without James in the office.", tags:["objection","process"] },
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
};

const SEED_REVIEW = [
  { id:1, postId:3, postTitle:"The $500K mistake hidden in your org chart", dueDate:"2025-06-27", status:"ready", platform:"Instagram", docViews:8, calls:0, impressions:1900, format:"Framework Drop", theme:"Owner Freedom", testGroup:"A", aiProposal:null },
  { id:2, postId:4, postTitle:"What 18 months watching founders taught me", dueDate:"2025-06-26", status:"ready", platform:"LinkedIn", docViews:19, calls:1, impressions:3100, format:"Observation + Principle", theme:"Delegation Ladder", testGroup:"B", aiProposal:null },
];

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

function voiceCtx(mind) {
  return `STEPHEN'S VOICE:
Frameworks: ${mind.frameworks.map(f=>f.title+": "+f.body).join(" | ")}
Client stories: ${mind.clientStories.map(s=>s.title+": "+s.body).join(" | ")}
Contrarian takes: ${mind.contrarian.map(c=>c.title+": "+c.body).join(" | ")}
Language: ${mind.language.map(l=>l.body).join(" | ")}
NEVER: corporate jargon, bullet lists. Short sentences. Specific numbers. Direct.`;
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

async function genPosts(raw, theme, fmt, mind, formats, bestPractice=[]) {
  const raw2 = await callClaude(
    `You are a ghostwriter for Stephen at BGB Consulting. He helps $1M–$5M business owners install a GM and escape the founder trap.\n${voiceCtx(mind)}\n${fmtCtx(formats)}\n${bpCtx(bestPractice)}\nReturn ONLY a single line of valid JSON. No newlines anywhere in the JSON. Use \n for line breaks in content. Format: {"insights":["insight1","insight2"],"variations":[{"platform":"LinkedIn","format":"fmt","hook":"hook","content":"line1\nline2\nline3"},{"platform":"Instagram","format":"fmt","hook":"hook","content":"short post"}],"suggestedABTest":{"hypothesis":"hyp","variantHook":"hook","variantContent":"content"}}`,
    `Raw input:\n${raw}\n\nTheme: ${theme}\nFormat: ${fmt||"best fit"}`,
    3000
  );
  return JSON.parse(raw2);
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

async function parseRawAnalytics(rawText, postLinks, mind, formats, bestPractice) {
  const raw = await callClaude(
    `You are the BGB Content Intelligence agent. You have received raw text scraped from a LinkedIn Analytics page. Extract every post you can identify, then analyse each one against the knowledge banks.\n${voiceCtx(mind)}\n${fmtCtx(formats)}\n${bpCtx(bestPractice)}\nPosts on LinkedIn analytics appear as: post text preview, then metrics (impressions, reactions, comments, reposts, clicks). Extract what you can. If metrics are missing, use 0.\nReturn ONLY valid JSON (no markdown, no explanation): {"summary":{"totalImpressions":0,"keyInsight":"...","topPattern":"...","weakestArea":"..."},"posts":[{"id":1,"hook":"first line of post","text":"post preview text","postType":"text|image|video|document","impressions":0,"reactions":0,"comments":0,"reposts":0,"clicks":0,"engagementRate":"0.00","hookScore":0-100,"matchedPattern":"pattern name or null","verdict":"strong|average|weak","whyWorked":"2 sentences","recommendation":"1 sentence","url":""}],"newPattern":{"title":"...","category":"hook|format|theme|engagement","pattern":"...","whyItWorks":"..."} or null,"recommendations":["...","..."]}`,
    `Raw LinkedIn Analytics page text (last 7 days):\n\n${rawText}\n\nPost URLs found on page: ${postLinks?.join(', ') || 'none'}\n\nExtract all posts visible in this analytics data and analyse them. Focus on identifying post text previews and their associated metrics.`,
    4000
  );
  return JSON.parse(raw);
}

async function analyzeAnalyticsImport(posts, mind, formats, bestPractice) {
  const raw = await callClaude(
    `You are the BGB Content Intelligence agent. Analyse LinkedIn post performance data from the last 7 days. Compare each post's hook, structure, and post type against the knowledge banks.\n${voiceCtx(mind)}\n${fmtCtx(formats)}\n${bpCtx(bestPractice)}\nReturn ONLY valid JSON: {"summary":{"keyInsight":"...","topPattern":"...","weakestArea":"..."},"postAnalyses":[{"id":1,"hook":"...","hookScore":0-100,"postType":"text|image|video|document|carousel","matchedPattern":"pattern name or null","verdict":"strong|average|weak","whyWorked":"2 sentences","recommendation":"1 sentence"}],"newPattern":{"title":"...","category":"hook|format|theme|engagement","pattern":"...","whyItWorks":"..."} or null,"recommendations":["...","..."]}`,
    `Analyse these ${posts.length} LinkedIn posts from the last 7 days. Impressions/reactions/comments are LinkedIn native metrics (not doc views):\n${JSON.stringify(posts.map(p=>({id:p.id,hook:p.hook,postType:p.postType,impressions:p.impressions,reactions:p.reactions,comments:p.comments,reposts:p.reposts,clicks:p.clicks,text:p.text?.slice(0,300)})))}`,
    3000
  );
  return JSON.parse(raw);
}

async function researchBestPractices(platform, mind) {
  const raw = await callClaude(
    `You are a content strategy researcher specialising in the SME/business coaching niche on social media. You know what patterns drive engagement, saves, and conversions for coaches targeting $1M–$5M business owners.\n${voiceCtx(mind)}\nReturn ONLY valid JSON: {"patterns":[{"title":"...","category":"hook|format|theme|engagement","platform":"LinkedIn|Instagram|Both","pattern":"the reusable structural technique","example":"brief example","whyItWorks":"why this converts for SME owners"}]} — return exactly 5 patterns.`,
    `Research the most effective content patterns for ${platform} in the SME business coaching and delegation/GM install niche. Focus on what drives saves, link clicks, and booked calls from business owners doing $1M–$5M revenue.`
  );
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : (parsed.patterns || []);
}

async function extractPattern(postText, mind) {
  const raw = await callClaude(
    `You are a content pattern analyst. Given a real social media post, extract the reusable structural and rhetorical pattern — not the topic, but the technique.\n${voiceCtx(mind)}\nReturn ONLY valid JSON: {"patterns":[{"title":"...","category":"hook|format|theme|engagement","platform":"LinkedIn|Instagram|Both","pattern":"the reusable pattern described generically","example":"brief example in Stephen's voice","whyItWorks":"the psychological reason this converts"}]}`,
    `Extract the reusable content pattern from this post:\n\n${postText}`
  );
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : (parsed.patterns || []);
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

// ─── VIEWS ────────────────────────────────────────────────────────────────────
function Dashboard({ posts, formats, reviewQueue, setPage }) {
  const pub = posts.filter(p=>p.status==="published");
  const totalDV = pub.reduce((s,p)=>s+p.docViews,0);
  const totalCalls = pub.reduce((s,p)=>s+p.calls,0);
  const totalImp = pub.reduce((s,p)=>s+p.impressions,0);
  const dvRate = totalImp>0?((totalDV/totalImp)*1000).toFixed(1):0;
  const proven = formats.filter(f=>f.status==="proven").length;
  const testing = formats.filter(f=>f.status==="testing").length;
  const pending = reviewQueue.filter(r=>r.status==="ready").length;
  const topPost = [...pub].sort((a,b)=>b.docViews-a.docViews)[0];
  return (
    <div>
      <div className="alert ag mb20 f fac g8">
        <span className="pulse"/><span><strong>Agent active.</strong> {pending} post{pending!==1?"s":""} ready for 7-day review · {proven} proven formats · {testing} in test</span>
        {pending>0&&<button className="btn bg bsm mla" onClick={()=>setPage("review")}>Review now →</button>}
      </div>
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

function MyMind({ mind, setMind }) {
  const [tab,setTab] = useState("frameworks");
  const [form,setForm] = useState({title:"",body:"",tags:""});
  const [saved,setSaved] = useState(false);
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
  const ac = cats.find(c=>c.key===tab);
  return (
    <div>
      <div className="alert av mb20"><strong>Your Mind Bank</strong> — everything here is injected into every AI generation call. Posts will always sound like you, reference your frameworks, and use real client outcomes.</div>
      <div className="g2">
        <div>
          <div className="tabs">{cats.map(c=><div key={c.key} className={`tab ${tab===c.key?"active":""}`} onClick={()=>setTab(c.key)}>{c.icon} {c.label}</div>)}</div>
          <div className="card">
            <div className="ct"><span>{ac.icon}</span> Add to {ac.label}</div>
            <div className="fg"><label className="lbl">Title</label><input className="inp" placeholder="Name this entry..." value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div className="fg"><label className="lbl">Content</label><textarea className="ta" style={{minHeight:130}} placeholder="The AI will use this verbatim in generation calls..." value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))}/></div>
            <div className="fg"><label className="lbl">Tags</label><input className="inp" placeholder="core, hiring, mindset..." value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))}/></div>
            <button className={`btn w100 ${saved?"bsa":"bp"}`} onClick={add}>{saved?"✓ Added to Your Mind":`Add to ${ac.label} →`}</button>
          </div>
        </div>
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

function Tracking({ posts, setPosts }) {
  const published = posts.filter(p=>p.status==="published");
  const platforms = ["All", ...Array.from(new Set(published.map(p=>p.platform)))];
  const [tab, setTab] = useState("All");
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);

  const visible = tab === "All" ? published : published.filter(p=>p.platform===tab);

  // initialise draft from current post values
  const initDraft = () => {
    const d = {};
    published.forEach(p => { d[p.id] = { impressions: p.impressions, engagement: p.engagement, docViews: p.docViews, calls: p.calls }; });
    setDraft(d);
  };

  useEffect(() => { initDraft(); }, [posts]);

  const set = (id, field, val) => setDraft(d => ({ ...d, [id]: { ...(d[id]||{}), [field]: val } }));

  const saveAll = () => {
    setPosts(prev => prev.map(p => {
      const v = draft[p.id];
      if (!v) return p;
      return { ...p, impressions: Number(v.impressions||0), engagement: Number(v.engagement||0), docViews: Number(v.docViews||0), calls: Number(v.calls||0) };
    }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const needsUpdate = p => p.impressions === 0 && p.docViews === 0;

  const totalDV = published.reduce((s,p)=>s+p.docViews,0);
  const totalImp = published.reduce((s,p)=>s+p.impressions,0);
  const totalCalls = published.reduce((s,p)=>s+p.calls,0);
  const dvRate = totalImp > 0 ? ((totalDV/totalImp)*1000).toFixed(1) : "—";

  return (
    <div>
      {/* weekly checklist banner */}
      <div className="alert ag mb16">
        <strong>Weekly data drop.</strong> Open each platform, copy the numbers in, hit Save All. Should take under 5 minutes.
        <div style={{marginTop:8,display:"flex",gap:16,flexWrap:"wrap"}}>
          {[["LinkedIn Analytics","https://www.linkedin.com/analytics/creator/"],["Instagram Insights","https://www.instagram.com/"],["YouTube Studio","https://studio.youtube.com/"]].map(([label,url])=>(
            <a key={label} href={url} target="_blank" rel="noreferrer" className="btn bo bsm">{label} ↗</a>
          ))}
        </div>
      </div>

      {/* summary strip */}
      <div className="g4 mb16">
        <div className="sc gold"><div className="sl">Total Doc Views</div><div className="sv">{totalDV}</div></div>
        <div className="sc rust"><div className="sl">Calls Booked</div><div className="sv">{totalCalls}</div></div>
        <div className="sc sage"><div className="sl">DV / 1k Imp</div><div className="sv">{dvRate}</div></div>
        <div className="sc ink"><div className="sl">Posts Live</div><div className="sv">{published.length}</div></div>
      </div>

      {published.length===0&&<div className="es card"><div className="esi">📊</div><p>No published posts yet.</p></div>}

      {published.length>0&&(
        <div className="card">
          {/* platform tabs + save button */}
          <div className="f fac fjb mb16" style={{borderBottom:"1px solid var(--border)",paddingBottom:14}}>
            <div className="f g4x">
              {platforms.map(pl=>(
                <button key={pl} className={`btn bsm ${tab===pl?"bp":"bo"}`} onClick={()=>setTab(pl)}>{pl}</button>
              ))}
            </div>
            <button className={`btn bsm ${saved?"bsa":"bg"}`} onClick={saveAll}>{saved?"✓ Saved":"Save All →"}</button>
          </div>

          {/* compact table */}
          <table>
            <thead>
              <tr>
                <th style={{width:200}}>Post</th>
                <th>Platform</th>
                <th style={{color:"var(--ink60)"}}>Impressions</th>
                <th style={{color:"var(--ink60)"}}>Engagement</th>
                <th style={{color:"var(--gold)"}}>Doc Views 🎯</th>
                <th style={{color:"var(--rust)"}}>Calls</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(p=>{
                const v = draft[p.id] || { impressions: p.impressions, engagement: p.engagement, docViews: p.docViews, calls: p.calls };
                const stale = needsUpdate(p);
                return (
                  <tr key={p.id} style={stale?{background:"rgba(201,168,76,0.04)"}:{}}>
                    <td>
                      <div style={{fontWeight:600,fontSize:12.5,marginBottom:2}}>{p.title}</div>
                      <div className="xs muted">{p.date}{stale&&<span style={{color:"var(--rust)",marginLeft:6}}>· needs data</span>}</div>
                    </td>
                    <td><span className="tag tb">{p.platform}</span></td>
                    <td><input type="number" style={{width:90,padding:"5px 8px",border:"1px solid var(--border)",borderRadius:2,fontSize:13,fontFamily:"DM Mono,monospace",background:"var(--paper)"}} value={v.impressions||""} onChange={e=>set(p.id,"impressions",e.target.value)} placeholder="0"/></td>
                    <td><input type="number" style={{width:90,padding:"5px 8px",border:"1px solid var(--border)",borderRadius:2,fontSize:13,fontFamily:"DM Mono,monospace",background:"var(--paper)"}} value={v.engagement||""} onChange={e=>set(p.id,"engagement",e.target.value)} placeholder="0"/></td>
                    <td><input type="number" style={{width:90,padding:"5px 8px",border:"2px solid var(--gold)",borderRadius:2,fontSize:13,fontFamily:"DM Mono,monospace",fontWeight:600,background:"rgba(201,168,76,0.06)"}} value={v.docViews||""} onChange={e=>set(p.id,"docViews",e.target.value)} placeholder="0"/></td>
                    <td><input type="number" style={{width:70,padding:"5px 8px",border:"1px solid var(--border)",borderRadius:2,fontSize:13,fontFamily:"DM Mono,monospace",background:"var(--paper)"}} value={v.calls||""} onChange={e=>set(p.id,"calls",e.target.value)} placeholder="0"/></td>
                    <td>{p.url&&<a href={p.url} target="_blank" rel="noreferrer" className="btn bo bsm">↗</a>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* per-platform totals */}
          {tab!=="All"&&(()=>{
            const pts = visible;
            const ptDV = pts.reduce((s,p)=>s+(draft[p.id]?.docViews||p.docViews),0);
            const ptImp = pts.reduce((s,p)=>s+(draft[p.id]?.impressions||p.impressions),0);
            const ptCalls = pts.reduce((s,p)=>s+(draft[p.id]?.calls||p.calls),0);
            return (
              <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid var(--border)",display:"flex",gap:24}}>
                <span className="xs muted">{tab} totals:</span>
                <span className="xs"><strong>{ptImp.toLocaleString()}</strong> impressions</span>
                <span className="xs" style={{color:"var(--gold)"}}><strong>{ptDV}</strong> doc views</span>
                <span className="xs"><strong>{ptCalls}</strong> calls</span>
                <span className="xs muted">{ptImp>0?((ptDV/ptImp)*1000).toFixed(1):"—"} DV/1k imp</span>
              </div>
            );
          })()}
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

function AnalyticsImport({ data, setData, mind, formats, bestPractice, setBestPractice, posts, setPosts, setPage }) {
  const [analysis,setAnalysis] = useState(null);
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const [patternSaved,setPatternSaved] = useState(false);
  const [metricsSaved,setMetricsSaved] = useState(false);

  const runAnalysis = async () => {
    setLoading(true); setErr("");
    try {
      let result;
      if(data?.rawText) {
        // Raw text from extension — let Claude parse + analyse in one pass
        result = await parseRawAnalytics(data.rawText, data.postLinks, mind, formats, bestPractice);
        // Merge extracted posts back into data so they show in the list
        setData(d => ({...d, posts: result.posts||[]}));
      } else if(data?.posts?.length) {
        result = await analyzeAnalyticsImport(data.posts, mind, formats, bestPractice);
      } else {
        throw new Error("No data to analyse.");
      }
      setAnalysis(result);
    }
    catch(e){setErr("Analysis failed: "+e.message);}
    finally{setLoading(false);}
  };

  const addPattern = () => {
    if(!analysis?.newPattern) return;
    setBestPractice(prev=>[...prev,{...analysis.newPattern,id:Date.now(),platform:"LinkedIn",source:"analytics-import",addedDate:new Date().toISOString().slice(0,10)}]);
    setPatternSaved(true); setTimeout(()=>setPatternSaved(false),2000);
  };

  const importMetrics = () => {
    if(!data?.posts?.length) return;
    let matchCount=0;
    const updated=posts.map(post=>{
      const matchedScraped=data.posts.find(sp=>{
        const spHook=(sp.hook||"").toLowerCase().slice(0,30);
        const pTitle=(post.title||"").toLowerCase();
        const pContent=(post.content||"").split("\n")[0].toLowerCase();
        return spHook.length>5&&(pTitle.includes(spHook.slice(0,20))||pContent.includes(spHook.slice(0,20)));
      });
      if(matchedScraped){matchCount++;return{...post,impressions:matchedScraped.impressions||post.impressions,engagement:(matchedScraped.reactions||0)+(matchedScraped.comments||0)+(matchedScraped.reposts||0)};}
      return post;
    });
    setPosts(updated);
    setMetricsSaved(true); setTimeout(()=>setMetricsSaved(false),2500);
  };

  const verdictCol={strong:"ts",average:"tg",weak:"tr"};
  const typeCol={video:"tv",image:"tb",document:"tprov",carousel:"tg",text:"ti"};

  if(!data){
    return(
      <div>
        <div className="card" style={{textAlign:"center",padding:56}}>
          <div style={{fontSize:40,marginBottom:14}}>📥</div>
          <div className="serif" style={{fontSize:18,marginBottom:8}}>No import pending</div>
          <div className="muted sm mb20">Install the BGB Chrome extension, open it, and click "Pull LinkedIn Analytics".</div>
          <div className="alert ag" style={{textAlign:"left",maxWidth:420,margin:"0 auto"}}>
            <strong>How to install the extension:</strong><br/>
            1. Open Chrome → go to <code>chrome://extensions</code><br/>
            2. Enable <strong>Developer mode</strong> (top right)<br/>
            3. Click <strong>Load unpacked</strong><br/>
            4. Select the <code>extension/</code> folder from this project<br/>
            5. The BGB icon will appear in your toolbar
          </div>
        </div>
      </div>
    );
  }

  const importedPosts=data.posts||[];
  const hasRawText=!!data.rawText&&importedPosts.length===0;
  const totalImp=data.summary?.totalImpressions||importedPosts.reduce((s,p)=>s+(p.impressions||0),0);
  const topPost=[...importedPosts].sort((a,b)=>(b.impressions||0)-(a.impressions||0))[0];
  const when=data.scrapedAt?new Date(data.scrapedAt).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";

  return(
    <div>
      <div className="g4 mb20">
        <div className="sc gold"><div className="sl">{hasRawText?"Page Captured":"Posts Found"}</div><div className="sv">{hasRawText?`${Math.round((data.rawText?.length||0)/1000)}K`:importedPosts.length}</div><div className="ss">{hasRawText?"chars · awaiting analysis":"last 7 days · LinkedIn"}</div></div>
        <div className="sc ink"><div className="sl">Total Impressions</div><div className="sv">{totalImp>=1000?(totalImp/1000).toFixed(1)+"K":totalImp||"—"}</div></div>
        <div className="sc sage"><div className="sl">Top Hook</div><div style={{fontSize:11,marginTop:4,fontWeight:500,lineHeight:1.4}}>{hasRawText?"↓ Run Analysis to extract":topPost?.hook?.slice(0,60)||"—"}</div></div>
        <div className="sc violet"><div className="sl">Captured</div><div style={{fontSize:11,marginTop:4,fontFamily:"DM Mono,monospace",color:"var(--ink60)"}}>{when}</div></div>
      </div>

      {hasRawText&&<div className="alert ag mb16"><strong>LinkedIn page captured.</strong> Click "Run Analysis" — Claude will read the raw analytics data and extract your posts, metrics, hooks and patterns.</div>}
      {err&&<div className="alert ar mb16">{err}</div>}

      <div className="card mb16">
        <div className="ct">🧠 Agent Analysis — All 3 Knowledge Banks</div>
        <div className="f fac g12 fw">
          <button className="btn bg" onClick={runAnalysis} disabled={loading}>
            {loading?<><span className="spin"/> Analysing...</>:"Run Analysis →"}
          </button>
          <button className={`btn bsm ${metricsSaved?"bsa":"bo"}`} onClick={importMetrics}>
            {metricsSaved?"✓ Metrics Updated":"Import Metrics to Tracking"}
          </button>
          {analysis?.newPattern&&(
            <button className={`btn bsm ${patternSaved?"bsa":"bv"}`} onClick={addPattern}>
              {patternSaved?"✓ Pattern Saved":"+ Add to Best Practice KB"}
            </button>
          )}
          <button className="btn bo bsm mla" onClick={()=>{setData(null);setAnalysis(null);setPage("dashboard");}}>Clear Import</button>
        </div>
      </div>

      {analysis&&(
        <>
          <div className="card mb16">
            <div className="ct">📊 Intelligence Report</div>
            <div className="g3 mb12">
              <div><div className="xs muted mb4">Key Insight</div><div className="sm">{analysis.summary?.keyInsight}</div></div>
              <div><div className="xs muted mb4">Top Pattern</div><div className="sm">{analysis.summary?.topPattern}</div></div>
              <div><div className="xs muted mb4">Weakest Area</div><div className="sm">{analysis.summary?.weakestArea}</div></div>
            </div>
            {analysis.recommendations?.length>0&&<div className="div">{analysis.recommendations.map((r,i)=><div key={i} className="f g8 mb6 mt8"><span style={{color:"var(--gold)",fontWeight:700}}>→</span><span className="sm">{r}</span></div>)}</div>}
            {analysis.newPattern&&<div className="alert av mt12"><strong>New pattern detected:</strong> "{analysis.newPattern.title}" — {analysis.newPattern.pattern}</div>}
          </div>
        </>
      )}

      <div className="card">
        <div className="ct">📋 Scraped Posts ({importedPosts.length})</div>
        {importedPosts.map((post,i)=>{
          // parseRawAnalytics embeds analysis on each post; analyzeAnalyticsImport uses a separate postAnalyses array
          const pa=analysis?.postAnalyses?.find(a=>a.id===post.id)||(post.verdict?post:null);
          return(
            <div key={post.id||i} className="li">
              <div className="libody">
                <div className="f fac g8 mb6">
                  <span className={`tag ${typeCol[post.postType]||"ti"}`}>{post.postType||"text"}</span>
                  {pa&&<span className={`tag ${verdictCol[pa.verdict]||"ti"}`}>{pa.verdict}</span>}
                  {pa?.matchedPattern&&<span className="tag tprov">↔ {pa.matchedPattern}</span>}
                  {pa?.hookScore!=null&&<span className="xs muted">Hook {pa.hookScore}/100</span>}
                </div>
                <div className="lititle">{post.hook||"(no hook extracted)"}</div>
                {post.text&&post.text!==post.hook&&<div className="liprev">{post.text}</div>}
                <div className="limetrics mt6">
                  <span className="mp"><strong>{(post.impressions||0).toLocaleString()}</strong> imp</span>
                  <span className="mp"><strong>{post.reactions||0}</strong> reactions</span>
                  <span className="mp"><strong>{post.comments||0}</strong> comments</span>
                  <span className="mp"><strong>{post.reposts||0}</strong> reposts</span>
                  {post.clicks>0&&<span className="mp hl"><strong>{post.clicks}</strong> clicks</span>}
                  {post.engagementRate&&<span className="mp"><strong>{post.engagementRate}%</strong> eng</span>}
                </div>
                {pa&&(
                  <div className="rp mt8">
                    <div className="sm mb4">{pa.whyWorked}</div>
                    <div className="xs" style={{color:"var(--violet)"}}>→ {pa.recommendation}</div>
                  </div>
                )}
                {post.url&&<div className="mt8"><a href={post.url} target="_blank" rel="noreferrer" className="btn bo bsm">View post ↗</a></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BestPracticeBank({ bestPractice, setBestPractice, mind }) {
  const [platTab,setPlatTab] = useState("All");
  const [catFilter,setCatFilter] = useState("all");
  const [resPlat,setResPlat] = useState("LinkedIn");
  const [resLoading,setResLoading] = useState(false);
  const [extractText,setExtractText] = useState("");
  const [extractLoading,setExtractLoading] = useState(false);
  const [extractPreview,setExtractPreview] = useState(null);
  const [err,setErr] = useState("");
  const [manualForm,setManualForm] = useState({platform:"LinkedIn",category:"hook",title:"",pattern:"",example:"",whyItWorks:"",source:"manual"});
  const [savedManual,setSavedManual] = useState(false);
  const [showExtract,setShowExtract] = useState(false);
  const [showManual,setShowManual] = useState(false);

  const CATS=["all","hook","format","theme","engagement"];
  const PLATS=["All","LinkedIn","Instagram","Both"];
  const catCol={hook:"tr",format:"tb",theme:"tg",engagement:"tv"};
  const platCol={LinkedIn:"tb",Instagram:"tv",Both:"tg"};

  const visible = bestPractice
    .filter(b=>platTab==="All"||b.platform===platTab||b.platform==="Both")
    .filter(b=>catFilter==="all"||b.category===catFilter);

  const doResearch = async () => {
    setResLoading(true); setErr("");
    try {
      const results = await researchBestPractices(resPlat, mind);
      const entries=(Array.isArray(results)?results:results.patterns||[]).map((p,i)=>({...p,id:Date.now()+i,source:"ai-research",addedDate:new Date().toISOString().slice(0,10)}));
      setBestPractice(prev=>[...prev,...entries]);
    } catch(e){setErr("Research failed: "+e.message);}
    finally{setResLoading(false);}
  };

  const doExtract = async () => {
    if(!extractText.trim()) return;
    setExtractLoading(true); setErr(""); setExtractPreview(null);
    try {
      const results = await extractPattern(extractText, mind);
      setExtractPreview(Array.isArray(results)?results:results.patterns||[]);
    } catch(e){setErr("Extraction failed: "+e.message);}
    finally{setExtractLoading(false);}
  };

  const saveExtracted = () => {
    if(!extractPreview) return;
    const entries=extractPreview.map((p,i)=>({...p,id:Date.now()+i,source:"ai-extract",addedDate:new Date().toISOString().slice(0,10)}));
    setBestPractice(prev=>[...prev,...entries]);
    setExtractPreview(null); setExtractText(""); setShowExtract(false);
  };

  const saveManual = () => {
    if(!manualForm.title||!manualForm.pattern) return;
    setBestPractice(prev=>[...prev,{...manualForm,id:Date.now(),addedDate:new Date().toISOString().slice(0,10)}]);
    setManualForm({platform:"LinkedIn",category:"hook",title:"",pattern:"",example:"",whyItWorks:"",source:"manual"});
    setSavedManual(true); setTimeout(()=>setSavedManual(false),1800);
  };

  const remove = id => setBestPractice(prev=>prev.filter(b=>b.id!==id));

  return (
    <div>
      <div className="alert av mb20"><strong>Best Practice Knowledge Bank</strong> — patterns from what's working across LinkedIn and Instagram in your niche. Injected into every Content Engine generation call alongside Your Mind Bank and What Works Bank.</div>
      {err&&<div className="alert ar mb16">{err}</div>}

      <div className="g2 mb16">
        <div className="card">
          <div className="ct">🔬 AI Research</div>
          <div className="fg"><label className="lbl">Platform to research</label>
            <select className="sel" value={resPlat} onChange={e=>setResPlat(e.target.value)}>
              {["LinkedIn","Instagram","Both"].map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <button className="btn bp w100" onClick={doResearch} disabled={resLoading}>
            {resLoading?<><span className="spin"/> Researching...</>:"Research Best Practices →"}
          </button>
          <div className="xs muted mt8">Claude analyses what content patterns drive engagement and conversions in the SME business coaching niche for this platform.</div>
        </div>

        <div className="card">
          <div className="ct">🧬 Extract from Post <button className="btn bgh bsm mla" onClick={()=>setShowExtract(s=>!s)}>{showExtract?"Hide ↑":"Paste a post ↓"}</button></div>
          {!showExtract&&<div className="xs muted">Found a high-performing post? Paste it here and Claude extracts the reusable pattern.</div>}
          {showExtract&&(
            <>
              <div className="fg"><label className="lbl">Paste a post</label>
                <textarea className="ta" style={{minHeight:110}} placeholder="Paste any LinkedIn or Instagram post here..." value={extractText} onChange={e=>setExtractText(e.target.value)}/>
              </div>
              <button className="btn bv bsm w100" onClick={doExtract} disabled={extractLoading||!extractText.trim()}>
                {extractLoading?<><span className="spin"/> Extracting...</>:"Extract Pattern →"}
              </button>
              {extractPreview&&extractPreview.length>0&&(
                <div className="rp mt12">
                  <div className="xs muted mb8">Extracted {extractPreview.length} pattern{extractPreview.length!==1?"s":""} — preview:</div>
                  {extractPreview.map((p,i)=>(
                    <div key={i} className="kbi mb8">
                      <div className="kbih"><div className="kbit">{p.title}</div><span className={`tag ${catCol[p.category]||"ti"}`}>{p.category}</span></div>
                      <div className="kbib">{p.pattern}</div>
                    </div>
                  ))}
                  <div className="f g8 mt8">
                    <button className="btn bsa bsm" onClick={saveExtracted}>Save to Bank →</button>
                    <button className="btn bo bsm" onClick={()=>setExtractPreview(null)}>Discard</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="f fac fjb mb12" style={{flexWrap:"wrap",gap:8}}>
        <div className="f" style={{gap:0,flexWrap:"wrap"}}>
          <div className="tabs" style={{marginBottom:0,borderBottom:"none"}}>
            {PLATS.map(p=><div key={p} className={`tab ${platTab===p?"active":""}`} onClick={()=>setPlatTab(p)}>{p}{p==="All"?` (${bestPractice.length})`:""}</div>)}
          </div>
          <div className="tabs" style={{marginBottom:0,borderBottom:"none",borderLeft:"1px solid var(--border)",marginLeft:8,paddingLeft:8}}>
            {CATS.map(c=><div key={c} className={`tab ${catFilter===c?"active":""}`} onClick={()=>setCatFilter(c)}>{c}</div>)}
          </div>
        </div>
        <button className="btn bo bsm" onClick={()=>setShowManual(s=>!s)}>+ Add Manually</button>
      </div>

      {showManual&&(
        <div className="card mb16">
          <div className="ct">✍️ Manual Entry</div>
          <div className="g2">
            <div>
              <div className="fg"><label className="lbl">Platform</label>
                <select className="sel" value={manualForm.platform} onChange={e=>setManualForm(f=>({...f,platform:e.target.value}))}>
                  {["LinkedIn","Instagram","Both"].map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="fg"><label className="lbl">Category</label>
                <select className="sel" value={manualForm.category} onChange={e=>setManualForm(f=>({...f,category:e.target.value}))}>
                  {["hook","format","theme","engagement"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="fg"><label className="lbl">Title</label>
                <input className="inp" placeholder="Name this pattern..." value={manualForm.title} onChange={e=>setManualForm(f=>({...f,title:e.target.value}))}/>
              </div>
            </div>
            <div>
              <div className="fg"><label className="lbl">Pattern (the reusable technique)</label>
                <textarea className="ta" style={{minHeight:80}} placeholder="Describe the structural pattern..." value={manualForm.pattern} onChange={e=>setManualForm(f=>({...f,pattern:e.target.value}))}/>
              </div>
              <div className="fg"><label className="lbl">Why it works</label>
                <input className="inp" placeholder="The psychological reason this converts..." value={manualForm.whyItWorks} onChange={e=>setManualForm(f=>({...f,whyItWorks:e.target.value}))}/>
              </div>
              <div className="fg"><label className="lbl">Example (optional)</label>
                <textarea className="ta" style={{minHeight:60}} placeholder="Quick example in Stephen's voice..." value={manualForm.example} onChange={e=>setManualForm(f=>({...f,example:e.target.value}))}/>
              </div>
            </div>
          </div>
          <button className={`btn w100 ${savedManual?"bsa":"bp"}`} onClick={saveManual}>{savedManual?"✓ Saved to Bank":"Add to Bank →"}</button>
        </div>
      )}

      <div style={{borderTop:"1px solid var(--border)",paddingTop:18}}>
        {visible.length===0&&<div className="es card"><div className="esi">🌐</div><p>No patterns yet. Click "Research Best Practices" to pull what's working across the internet, or add manually.</p></div>}
        {visible.map(b=>(
          <div key={b.id} className="kbi">
            <div className="kbih">
              <div style={{flex:1}}>
                <div className="f fac g8 mb6">
                  <span className={`tag ${platCol[b.platform]||"ti"}`}>{b.platform}</span>
                  <span className={`tag ${catCol[b.category]||"ti"}`}>{b.category}</span>
                  <span className="kbit">{b.title}</span>
                </div>
                <div className="kbib">{b.pattern}</div>
                {b.whyItWorks&&<div className="xs muted mt6">→ {b.whyItWorks}</div>}
                {b.example&&<div className="xs muted mt4" style={{fontStyle:"italic",whiteSpace:"pre-wrap"}}>"{b.example}"</div>}
              </div>
              <button className="btn bgh bsm" style={{color:"var(--rust)",alignSelf:"flex-start",flexShrink:0}} onClick={()=>remove(b.id)}>Remove</button>
            </div>
            <div className="kbif">
              <span className="tag ti">{b.source==="ai-research"?"AI research":b.source==="ai-extract"?"AI extract":"manual"}</span>
              <span className="xs muted">· {b.addedDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
const NAV = [
  {sec:"Core Loop"},
  {id:"dashboard",label:"Dashboard",icon:"◈"},
  {id:"engine",label:"Content Engine",icon:"⊕"},
  {id:"publish",label:"Publishing",icon:"↑"},
  {id:"tracking",label:"Tracking",icon:"◉"},
  {sec:"Intelligence"},
  {id:"analytics",label:"Analytics Import",icon:"📥",badge:"analytics"},
  {id:"review",label:"Review Queue",icon:"◐",badge:"review"},
  {id:"report",label:"Weekly Report",icon:"📊"},
  {sec:"Knowledge Banks"},
  {id:"mind",label:"Your Mind",icon:"🧠"},
  {id:"whatworks",label:"What Works",icon:"✦"},
  {id:"bestpractice",label:"Best Practices",icon:"🌐"},
  {sec:"Library"},
  {id:"input",label:"Content Input",icon:"✍️"},
];

const TITLES = {dashboard:"Dashboard",engine:"Content Engine",publish:"Publishing Workflow",tracking:"Performance Tracking",analytics:"Analytics Import",review:"7-Day Review Queue",report:"Weekly Agent Report",mind:"Your Mind Bank",whatworks:"What Works Bank",bestpractice:"Best Practice Knowledge Bank",input:"Content Library"};

export default function App() {
  const [page,setPage] = useState("dashboard");
  const [posts,setPosts] = useState(SEED_POSTS);
  const [assets,setAssets] = useState([
    {id:1,type:"transcript",title:"James — GM hire journey call",date:"2025-06-04",content:"James said the biggest fear was 'nobody can do this the way I do.' We spent 90 minutes documenting his 12 core decisions. By month 2, his GM had handled all of them without calling James once.",summary:"James's GM hire story — the 'nobody does it like me' objection dissolved.",tags:["GM install","objection"]},
    {id:2,type:"notes",title:"The Delegation Ladder — full framework",date:"2025-05-30",content:"5 rungs. Most owners jump from rung 1 to 5 and wonder why it fails. Rung 2 requires written process. Rung 3 requires weekly check-in. The key: the ladder isn't about trust. It's about documentation.",summary:"Full notes on the Delegation Ladder — all 5 rungs with examples.",tags:["delegation","framework"]},
  ]);
  const [mind,setMind] = useState(SEED_MIND);
  const [formats,setFormats] = useState(SEED_FORMATS);
  const [reviewQueue,setReviewQueue] = useState(SEED_REVIEW);
  const [bestPractice,setBestPractice] = useState(SEED_BESTPRACTICE);
  const [analyticsImport,setAnalyticsImport] = useState(null);
  useEffect(()=>{
    const handler = e => { setAnalyticsImport(e.detail); setPage("analytics"); };
    window.addEventListener("bgb-analytics-import", handler);
    return ()=>window.removeEventListener("bgb-analytics-import", handler);
  },[]);
const [engineState,setEngineState] = useState({});
  const pending = reviewQueue.filter(r=>r.status==="ready").length;
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
                {n.badge==="analytics"&&analyticsImport&&<span className="sb-badge">NEW</span>}
              </div>
            )}
          </nav>
          <div className="sb-foot">Content → Post → Click<br/>→ Doc View → Call<br/>→ Learn → Repeat</div>
        </aside>
        <main className="main">
          <div className="topbar">
            <div className="tb-title">{TITLES[page]}</div>
            <div className="tb-meta">
              {new Date().toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}<br/>
              {formats.filter(f=>f.status==="proven").length} proven · {formats.filter(f=>f.status==="testing").length} testing · {mind.frameworks.length+mind.clientStories.length+mind.contrarian.length+mind.language.length} mind entries
            </div>
          </div>
          <div className="pg">
            {page==="dashboard"&&<Dashboard posts={posts} formats={formats} reviewQueue={reviewQueue} setPage={setPage}/>}
            {page==="engine"&&<ContentEngine assets={assets} posts={posts} setPosts={setPosts} formats={formats} mind={mind} setPage={setPage} engineState={engineState} setEngineState={setEngineState} bestPractice={bestPractice}/>}
            {page==="publish"&&<Publishing posts={posts} setPosts={setPosts} reviewQueue={reviewQueue} setReviewQueue={setReviewQueue}/>}
            {page==="tracking"&&<Tracking posts={posts} setPosts={setPosts}/>}
            {page==="analytics"&&<AnalyticsImport data={analyticsImport} setData={setAnalyticsImport} mind={mind} formats={formats} bestPractice={bestPractice} setBestPractice={setBestPractice} posts={posts} setPosts={setPosts} setPage={setPage}/>}
            {page==="review"&&<ReviewQueue posts={posts} setPosts={setPosts} formats={formats} setFormats={setFormats} reviewQueue={reviewQueue} setReviewQueue={setReviewQueue} mind={mind}/>}
            {page==="report"&&<WeeklyReport posts={posts} formats={formats} mind={mind}/>}
            {page==="mind"&&<MyMind mind={mind} setMind={setMind}/>}
            {page==="whatworks"&&<WhatWorksBank formats={formats} setFormats={setFormats} mind={mind}/>}
            {page==="bestpractice"&&<BestPracticeBank bestPractice={bestPractice} setBestPractice={setBestPractice} mind={mind}/>}
            {page==="input"&&<ContentLibrary assets={assets} setAssets={setAssets}/>}
          </div>
        </main>
      </div>
    </>
  );
}
