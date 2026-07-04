import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1440,height:1050}});
const errs=[];p.on('console',m=>{if(m.type()==='error'&&!/favicon|fonts\.g|net::ERR_CONNECTION_RESET|504/.test(m.text()))errs.push(m.text());});p.on('pageerror',e=>errs.push('PE: '+e.message));
await p.goto('http://localhost:5174/login',{waitUntil:'domcontentloaded'});
await p.waitForSelector('input[type=email]',{timeout:20000});
await p.fill('input[type=email]','admin@divideyou.test');await p.fill('input[type=password]','Password1');
await p.click('button[type=submit]');await p.waitForTimeout(1500);
const pages=[['users','/users'],['user','/user/PLACEHOLDER'],['admins','/users-cms'],['payments','/payments/pay-in'],['programs','/programs'],['bonuses','/bonuses'],['regulations','/regulations'],['news','/news'],['faq','/faq'],['partners','/system-partners'],['files','/files'],['parameters','/parameters'],['statistics','/statistics']];
// get a user id for detail
const uid=await p.evaluate(async()=>{const t=localStorage.getItem('divideyou_cms_token');const r=await fetch('/api/admin/users?perPage=1',{headers:{Authorization:'Bearer '+t}});const d=await r.json();return (d.items&&d.items[0]&&d.items[0].id)||'';});
for(const [n,path] of pages){
  const url='http://localhost:5174'+path.replace('PLACEHOLDER',uid);
  await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForTimeout(900);
  await p.screenshot({path:`/tmp/dyresp/cx-${n}.png`});
}
// midnight theme on users
await p.goto('http://localhost:5174/users',{waitUntil:'domcontentloaded'});await p.waitForTimeout(700);
await p.click('button[title="Motyw Midnight"]');await p.waitForTimeout(600);
await p.screenshot({path:'/tmp/dyresp/cx-midnight-users.png'});
console.log('user id used:',uid||'(none)');
console.log('errors:',errs.length);errs.slice(0,10).forEach(e=>console.log(' !',e));
await b.close();
