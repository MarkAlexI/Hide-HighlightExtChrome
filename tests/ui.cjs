/* Production popup layout and interaction checks with a controlled API fixture. */
const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
let pw;try{pw=require('playwright')}catch{pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright')}
const root=path.resolve(__dirname,'..');
function shim({messages,locale}){
 const state={draft:{enabled:true,blurText:'Alex Morgan',highlightText:'Friday;deadline',wholeWords:false,caseSensitive:false,scope:'tab'},config:{enabled:true,hasRule:true},colors:{background:'#ffe08a',text:'#172033',shadow:'#d46200',useShadow:false},status:{enabled:true,counts:{blur:1,highlight:2}}};window.__uiState=state;window.__writes=[];const changes=[];
 const api={i18n:{getUILanguage:()=>locale,getMessage:(key,args=[])=>{let value=messages[key]?.message||'';args.forEach((arg,i)=>value=value.replaceAll('$'+(i+1),arg));return value}},tabs:{query:async()=>[{id:7}],create:async()=>({id:8})},storage:{onChanged:{addListener:fn=>changes.push(fn)}},runtime:{getURL:p=>'file://'+p,onMessage:{addListener(){}},sendMessage:async m=>{if(m.type==='hh:open')return{ok:true,available:true,...state};if(m.type==='hh:draft'){state.draft=m.rule;window.__writes.push(m.rule);return{ok:true}}if(m.type==='hh:colors'){state.colors=m.colors;changes.forEach(fn=>fn({hhPreferences:{newValue:{colors:m.colors}}},'local'));return{ok:true,colors:m.colors}}if(m.type==='hh:apply-rule'){state.config={...m.rule,hasRule:true};return{ok:true,config:state.config}}if(m.type==='hh:pause'){state.config.enabled=!state.config.enabled;return{ok:true,config:state.config}}if(m.type==='hh:reset'){state.config.enabled=false;return{ok:true,config:state.config}}return{ok:true}}}};
 window.chrome=api;window.browser=api;
}
async function run(){
 const browser=await pw.chromium.launch({headless:true,...process.env.HH_BROWSER_PATH?{executablePath:process.env.HH_BROWSER_PATH}:{},args:['--no-sandbox']});let passed=0;const layouts=[];
 for(const locale of fs.readdirSync(path.join(root,'_locales')))for(const width of [280,320,360,412]){
  const page=await browser.newPage({viewport:{width,height:600}});const messages=JSON.parse(fs.readFileSync(path.join(root,'_locales',locale,'messages.json'),'utf8'));await page.addInitScript(shim,{messages,locale});
  await page.goto('file://'+path.join(root,'popup.html'));await page.waitForFunction(()=>!document.getElementById('rule-fields').disabled);
  const layout=await page.evaluate(()=>({locale:document.documentElement.lang,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,applyBottom:document.getElementById('apply').getBoundingClientRect().bottom,bodyHeight:document.body.getBoundingClientRect().height,dir:document.documentElement.dir}));
  assert.ok(layout.scrollWidth<=width,JSON.stringify(layout));assert.ok(layout.applyBottom<=600,JSON.stringify(layout));assert.ok(layout.bodyHeight<=600,JSON.stringify(layout));layouts.push(layout);passed++;
  if(locale==='en'&&width===360){
   await page.locator('#blur-words').fill('unsaved words');await page.waitForFunction(()=>window.__writes.at(-1)?.blurText==='unsaved words');passed++;
   await page.locator('[data-preset=mint]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-preset=mint]').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>document.activeElement.dataset.preset),'mint');passed++;
   await page.setViewportSize({width:360,height:320});await page.locator('#blur-words').focus();await page.waitForFunction(()=>document.body.classList.contains('editing'));assert.ok(await page.evaluate(()=>document.body.getBoundingClientRect().height)<=320);assert.ok(await page.locator('#apply').evaluate(e=>e.getBoundingClientRect().bottom)<=320);passed++;
  }
  await page.close();
 }
 await browser.close();console.log(JSON.stringify({passed,layouts},null,2));
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
module.exports={shim};
