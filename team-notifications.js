(()=>{
 const $=id=>document.getElementById(id);let owner='',timer=null,busy=false,baseline=false,lastSeen=new Set();
 const dialog=document.createElement('dialog');dialog.className='team-alert-dialog';dialog.id='teamAlertDialog';dialog.setAttribute('aria-labelledby','teamAlertTitle');
 dialog.innerHTML='<div class="team-alert-header"><h2 id="teamAlertTitle">Notifications</h2><button id="teamAlertClose" type="button" aria-label="Close notifications">✕</button></div><p class="team-alert-notice">Order arrivals, delivery progress, rides, applications and payment activity—all in one place.</p><button id="teamEnableAlerts" type="button">Enable alerts on this device</button><label class="team-alert-settings"><input id="teamAlertSound" type="checkbox">Play a sound for new activity while this page is open</label><p id="teamAlertStatus" class="team-alert-notice" role="status"></p><button id="teamMarkRead" type="button">Mark all as read</button><div id="teamAlertRows"></div>';
 document.body.append(dialog);$('teamAlertClose').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 const bell=$('notifyButton');bell.textContent='Notifications';const badge=document.createElement('span');badge.id='teamAlertCount';badge.hidden=true;bell.append(badge);bell.onclick=()=>{dialog.showModal();load();};
 const sound=$('teamAlertSound');sound.onchange=()=>{if(owner)localStorage.setItem('team.sound.'+owner,String(sound.checked));if(sound.checked)initAudioContext();};
 async function rpc(name,args){const {data,error}=await supabaseClient.rpc(name,args).abortSignal(AbortSignal.timeout(12000));if(error)throw error;return data;}
 async function registerTeamSubscription(reg){let subscription=await reg.pushManager.getSubscription();if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});await rpc('swift_team_save_push',{p_subscription:subscription.toJSON()});return subscription;}
 const originalEnable=window.enableNotifications;
 window.enableNotifications=async()=>{
  const b=$('teamEnableAlerts');b.disabled=true;
  try{
   if(!currentUser||!currentProfile?.active)throw Error('Sign in to an active team account first.');
   if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw Error('Web push is unavailable here. On iPhone, add this site to your Home Screen and open it there.');
   initAudioContext();if(await Notification.requestPermission()!=='granted')throw Error('Permission was not granted. You can allow notifications in your browser settings.');
   const reg=await navigator.serviceWorker.register('./swiftshop-worker-sw.js',{scope:'./'});await navigator.serviceWorker.ready;
   await registerTeamSubscription(reg);
   // Preserve the existing offer senders as well as new team activity alerts.
   if(currentProfile.role==='runner'){const subscription=await reg.pushManager.getSubscription();await rpc('save_push_subscription',{p_subscription:subscription.toJSON()});}
   if(currentProfile.role==='driver'){const subscription=await reg.pushManager.getSubscription();await rpc('swift_driver_save_push',{p_subscription:subscription.toJSON()});}
   $('teamAlertStatus').textContent='This device is linked. Enable alerts separately on your phone and laptop.';b.textContent='Alerts enabled on this device';
  }catch(e){$('teamAlertStatus').textContent='Could not enable alerts: '+e.message;}
  finally{b.disabled=false;}
 };
 $('teamEnableAlerts').onclick=()=>window.enableNotifications();
 const originalSync=window.syncExistingPushSubscription;
 window.syncExistingPushSubscription=async()=>{await originalSync();if(!currentUser||!('Notification'in window)||Notification.permission!=='granted')return;try{const reg=await navigator.serviceWorker.ready;const subscription=await reg.pushManager.getSubscription();if(subscription)await rpc('swift_team_save_push',{p_subscription:subscription.toJSON()});}catch{}};
 async function load(){
  if(!currentUser||busy)return;busy=true;const uid=currentUser.id;
  try{const rows=await rpc('swift_team_notifications');if(uid!==currentUser?.id)return;const unread=rows.filter(r=>!r.read_at).length;badge.hidden=!unread;badge.textContent=unread>99?'99+':String(unread);bell.setAttribute('aria-label',unread+' unread notifications');
   const fresh=rows.filter(r=>!lastSeen.has(r.id)&&!r.read_at);if(baseline&&fresh.length){toast(fresh.length===1?fresh[0].title:fresh.length+' new team updates');if(sound.checked){initAudioContext();playBeepSound();}}
   lastSeen=new Set(rows.map(r=>r.id));baseline=true;
   const list=$('teamAlertRows');list.replaceChildren();for(const r of rows){const b=document.createElement('button');b.type='button';b.className='team-alert-row'+(!r.read_at?' unread':'');const title=document.createElement('strong'),body=document.createElement('span'),time=document.createElement('small');title.textContent=r.title;body.textContent=r.body;time.textContent=new Date(r.created_at).toLocaleString();b.append(title,body,time);b.onclick=async()=>{try{await rpc('swift_team_mark_read',{p_id:r.id});dialog.close();window.switchTab(r.page);await load();}catch(e){$('teamAlertStatus').textContent=e.message;}};list.append(b);}if(!rows.length){const p=document.createElement('p');p.className='team-alert-notice';p.textContent='You’re all caught up. New activity will appear here.';list.append(p);}
  }catch(e){$('teamAlertStatus').textContent='Inbox could not load. If this is the first setup, install the team-notification SQL and sender. '+e.message;}
  finally{busy=false;}
 }
 $('teamMarkRead').onclick=async()=>{try{await rpc('swift_team_mark_read',{p_id:null});await load();}catch(e){$('teamAlertStatus').textContent=e.message;}};
 const oldInit=window.initDashboard;window.initDashboard=function(){const result=oldInit.apply(this,arguments);if(owner!==currentUser?.id){owner=currentUser?.id||'';baseline=false;lastSeen=new Set();sound.checked=localStorage.getItem('team.sound.'+owner)==='true';}clearInterval(timer);load();timer=setInterval(()=>{if(!document.hidden)load();},6000);return result;};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});window.addEventListener('online',load);
 navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='team-notification')load();});
 const oldLogout=window.handleRunnerLogout;window.handleRunnerLogout=async()=>{clearInterval(timer);try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.getRegistration('./');const subscription=await reg?.pushManager.getSubscription();if(subscription){try{await rpc('swift_team_remove_push',{p_endpoint:subscription.endpoint});}finally{await subscription.unsubscribe();}}}}catch{}return oldLogout();};
})();
