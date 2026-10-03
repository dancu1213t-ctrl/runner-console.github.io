self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{payload={body:event.data?.text()||'A new request is available.'};}
 const data=payload.notification||payload;const title=data.title||'SwiftShop · New work available';
 const fallback=new URL('./',self.registration.scope).href;let url=fallback;
 try{const proposed=new URL(payload.url||data.url||payload.data?.url||fallback,self.registration.scope);if(proposed.origin===self.location.origin)url=proposed.href;}catch{}
 event.waitUntil(self.registration.showNotification(title,{body:data.body||'Open your workspace to view and accept.',icon:data.icon||'logo.png',badge:'logo.png',tag:data.tag||payload.tag||'swiftshop-work',renotify:true,data:{url},vibrate:[180,80,180]}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=event.notification.data?.url||self.registration.scope;
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(client.url.startsWith(self.registration.scope)&&'focus'in client){if('navigate'in client)await client.navigate(url);return client.focus();}}return self.clients.openWindow(url);})());
});
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
