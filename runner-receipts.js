// Aggregate preparation state only; customer details remain in the administrator desk.
(()=>{
 const board=document.getElementById('runnerWorkboard');if(!board)return;
 const note=document.createElement('p');note.className='runner-dispatch-receipt';note.hidden=true;note.setAttribute('role','status');board.prepend(note);
 let busy=false,timer;
 async function refresh(){if(currentProfile?.role!=='runner'){note.hidden=true;return;}if(busy)return;busy=true;const uid=currentUser?.id;try{const {data,error}=await supabaseClient.rpc('swift_runner_dispatch_waiting').abortSignal(AbortSignal.timeout(10000));if(error)throw error;if(currentUser?.id!==uid)return;note.hidden=false;note.textContent=data>0?data+' customer order'+(data===1?' is':'s are')+' awaiting administrator dispatch. Delivery offers appear below once released.':'No customer orders are awaiting dispatch. New delivery offers will appear below.';}catch{note.hidden=false;note.textContent='Preparation status could not load. Delivery offers are listed below; reconnect or refresh to update.';}finally{busy=false;}}
 const init=window.initDashboard;window.initDashboard=function(){const r=init.apply(this,arguments);clearInterval(timer);refresh();timer=setInterval(()=>{if(!document.hidden)refresh();},10000);return r;};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('online',refresh);
})();
