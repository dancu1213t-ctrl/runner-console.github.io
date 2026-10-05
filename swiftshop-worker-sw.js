self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
function notificationURL(value){
 const target=new URL('./',self.registration.scope);target.hash='dispatch';
 try{
  const supplied=new URL(value||target.href,self.registration.scope);
  if(supplied.origin!==self.location.origin)return target.href;
  const pages=['dispatch','available','active','rides','applications','payments','team'];
  const page=supplied.hash.slice(1).split(/[?&/]/)[0];
  if(pages.includes(page))target.hash=page;
 }catch{}
 return target.href;
}
self.addEventListener('push',e=>{let p={};try{p=e.data?.json()||{};}catch{p={body:'Open SwiftShop to see your update.'};}if(!p||typeof p!=='object')p={};e.waitUntil((async()=>{await self.registration.showNotification(p.title||'SwiftShop team update',{body:p.body||'Open your workspace for details.',tag:p.tag||'swiftshop-team-update',icon:new URL('./logo.png',self.registration.scope).href,badge:new URL('./icon-192.png',self.registration.scope).href,data:{url:notificationURL(p.url)}});for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true}))c.postMessage({type:'team-notification'});})());});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=notificationURL(e.notification.data?.url);e.waitUntil((async()=>{for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true})){if(new URL(c.url).origin===self.location.origin){await c.navigate(url);return c.focus();}}return self.clients.openWindow(url);})());});

