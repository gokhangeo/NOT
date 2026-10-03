const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('offline shell includes all real assets; offline navigation and scripts fall back to cache',async()=>{
 const handlers={},cache=new Map(),pending=[];let installAssets=[];
 const context={URL,Promise,self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}},registration:{scope:'https://example.test/NOT/'}},caches:{open:async()=>({addAll:async assets=>{installAssets=assets;assets.forEach(a=>cache.set(a,'cached '+a));},put:async(k,v)=>cache.set(k,v)}),keys:async()=>['cepte-not-old','other-app'],delete:async()=>true,match:async request=>cache.get(typeof request==='string'?request:request.url)||'cached script'},fetch:async()=>{throw new Error('offline');}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../sw.js','utf8'),context);
 handlers.install({waitUntil:p=>pending.push(p)});await Promise.all(pending);
 for(const asset of installAssets){const path=asset==='./'?'index.html':asset.slice(2).split('?')[0];assert(fs.existsSync(__dirname+'/../'+path),path);}
 let result;handlers.fetch({request:{method:'GET',url:'https://example.test/NOT/',mode:'navigate'},respondWith:p=>result=p});assert.equal(await result,'cached ./index.html');
 handlers.fetch({request:{method:'GET',url:'https://example.test/NOT/app.js?v=5.0.0',mode:'cors'},respondWith:p=>result=p});assert.equal(await result,'cached script');
 let intercepted=false;handlers.fetch({request:{method:'GET',url:'https://api.github.com/repos/gokhangeo/NOT',mode:'cors'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
});
