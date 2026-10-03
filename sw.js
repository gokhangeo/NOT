const CACHE = 'cepte-not-v5.0.1';
const SHELL = ['./', './index.html', './styles.css?v=5.0.1', './core.js?v=5.0.1', './cloud-config.js?v=5.0.1', './app.js?v=5.0.1', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cepte-not-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin||new URL(event.request.url).pathname.endsWith('notes.json'))return;
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));}return response;}).catch(()=>caches.match('./index.html')));
  else event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;})));
});
self.addEventListener('notificationclick', event => {event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const own=clients.find(c=>c.url.startsWith(self.registration.scope));if(own){await own.focus();own.postMessage({type:'open-note',id:event.notification.data?.id});}else await self.clients.openWindow(self.registration.scope);}));});
