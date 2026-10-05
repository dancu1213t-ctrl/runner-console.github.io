(() => {
 'use strict';
 const button=document.createElement('button');button.type='button';button.className='team-scan-launch';button.textContent='Scan customer QR';button.hidden=true;
 const alerts=document.getElementById('notifyButton');alerts?.parentElement.append(button);
 const dialog=document.createElement('dialog');dialog.className='team-scan-dialog';dialog.setAttribute('aria-labelledby','teamScanTitle');
 dialog.innerHTML='<header><div><p>SWIFTSHOP CONFIRMATION</p><h2 id="teamScanTitle">Scan the customer’s code</h2></div><button type="button" data-close aria-label="Close scanner">✕</button></header><p class="team-scan-intro">Confirm the right delivery or ride at handoff. Camera images stay on this device.</p><div class="team-scan-camera" hidden><video playsinline muted></video><span aria-hidden="true"></span></div><div class="team-scan-controls"><button type="button" data-camera>Open camera</button><label>Scan saved QR image<input type="file" accept="image/*" data-image></label></div><p data-status role="status">Use your rear camera to scan the code on the customer’s screen.</p><section data-match hidden><h3></h3><p data-customer></p><p data-reference></p><button type="button" data-confirm>Confirm completion</button></section>';
 document.body.append(dialog);
 const $=selector=>dialog.querySelector(selector),video=$('video'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 let stream=null,version=0,timer=null,payload=null,processing=false;
 function eligible(){return !!currentUser&&['runner','driver'].includes(currentProfile?.role);}
 function stop(){++version;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;$('.team-scan-camera').hidden=true;}
 function reset(){stop();payload=null;$('[data-match]').hidden=true;$('[data-confirm]').disabled=false;}
 async function rpc(args){const {data,error}=await supabaseClient.rpc('swift_scan_completion',args).abortSignal(AbortSignal.timeout(12000));if(error)throw error;return data;}
 function identify(data){$('[data-match] h3').textContent=data.title;$('[data-customer]').textContent=data.name||'Customer';$('[data-reference]').textContent=(data.kind==='ride'?'Ride #':'Order #')+String(data.reference).slice(0,8).toUpperCase();$('[data-match]').hidden=false;}
 async function scanned(text){
  if(processing)return;stop();const token=version,uid=currentUser?.id;processing=true;$('[data-status]').textContent='Checking assignment and code…';
  try{if(!eligible())throw Error('Sign in as an approved runner or driver.');const data=await rpc({p_payload:text,p_complete:false});if(!dialog.open||token!==version||uid!==currentUser?.id)return;identify(data);payload=text;$('[data-confirm]').disabled=!!data.completed;$('[data-confirm]').textContent=data.completed?'Already completed':data.kind==='ride'?'Confirm ride completed':'Confirm delivery handed over';$('[data-status]').textContent=data.completed?'This confirmation has already been recorded.':'Check the reference and customer. Confirm only after the handoff or trip is complete.';}
  catch(e){payload=null;$('[data-match]').hidden=true;$('[data-status]').textContent=e.message||'Could not check this code. Try again.';}
  finally{processing=false;}
 }
 function decode(source,width,height){const scale=Math.min(1,640/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));ctx.drawImage(source,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);return window.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'dontInvert'})?.data;}
 async function camera(){
  if(processing)return;reset();const token=version;
  try{if(!eligible())throw Error('Sign in as a runner or driver.');if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera is unavailable. Use a saved QR image instead.');
   const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
   if(token!==version||!dialog.open){next.getTracks().forEach(t=>t.stop());return;}stream=next;video.srcObject=stream;await video.play();$('.team-scan-camera').hidden=false;$('[data-status]').textContent='Hold the code inside the frame.';
   const frame=()=>{if(token!==version||!stream)return;try{if(video.readyState>=2){const text=decode(video,video.videoWidth,video.videoHeight);if(text){scanned(text);return;}}timer=setTimeout(frame,180);}catch{stop();$('[data-status]').textContent='Camera scan interrupted. Reopen camera or use a QR image.';}};frame();
  }catch(e){stop();$('[data-status]').textContent=e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in browser settings, or scan a saved QR image.':e.message||'Could not open camera.';}
 }
 button.onclick=()=>{if(!eligible())return;reset();$('[data-status]').textContent='Open your camera when the customer is ready.';dialog.showModal();};
 $('[data-camera]').onclick=camera;$('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',reset);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 $('[data-image]').onchange=async e=>{if(processing)return;reset();const file=e.target.files?.[0];e.target.value='';if(!file)return;const token=version;try{if(file.size>12*1024*1024)throw Error('Choose an image smaller than 12 MB.');const image=await createImageBitmap(file);let text;try{text=decode(image,image.width,image.height);}finally{image.close();}if(token!==version||!dialog.open)return;if(!text)throw Error('No readable QR code found. Try a clearer image.');await scanned(text);}catch(e){$('[data-status]').textContent=e.message;}};
 $('[data-confirm]').onclick=async()=>{if(!payload||processing)return;processing=true;$('[data-confirm]').disabled=true;try{const data=await rpc({p_payload:payload,p_complete:true});identify(data);$('[data-status]').textContent=data.kind==='ride'?'Ride completion confirmed.':'Delivery handoff confirmed.';$('[data-confirm]').textContent='Completion recorded';if(typeof fetchOrders==='function')fetchOrders();document.dispatchEvent(new Event('swift-completion-confirmed'));}catch(e){$('[data-status]').textContent=e.message;$('[data-confirm]').disabled=false;}finally{processing=false;}};
 const init=window.initDashboard;window.initDashboard=function(){const result=init.apply(this,arguments);button.hidden=!eligible();return result;};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 const logout=window.handleRunnerLogout;window.handleRunnerLogout=async function(){if(dialog.open)dialog.close();reset();button.hidden=true;return logout.apply(this,arguments);};
})();
