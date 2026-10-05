(() => {
 'use strict';
 const login=document.getElementById('loginScreen');
 const shell=login?.querySelector('.signin-shell');
 if(!shell)return;
 const fields=shell.querySelector('.space-y-5');
 const tabs=document.getElementById('workerSignIn')?.parentElement;
 const card=document.createElement('form');card.id='teamAuthCard';card.hidden=true;shell.append(card);
 const notice=document.createElement('p');notice.id='teamLoginNotice';notice.setAttribute('role','alert');fields.append(notice);
 const actions=document.createElement('div');actions.className='team-auth-actions';
 actions.innerHTML='<button type="button" data-auth="code">Sign in with email code</button><button type="button" data-auth="reset">Set or reset password</button>';
 fields.append(actions);
 let pendingEmail='',resetMode=false,verifiedUser=null,afterPassword=null,busy=false,lastSent=0;
 const auth=()=>supabaseClient.auth;
 function showCard(){fields.hidden=true;tabs.hidden=true;document.getElementById('workerApplyForm').hidden=true;document.getElementById('workerConfirmApply').hidden=true;card.hidden=false;}
 function back(){if(busy)return;card.reset();card.hidden=true;fields.hidden=false;tabs.hidden=false;pendingEmail='';verifiedUser=null;afterPassword=null;notice.textContent='';}
 function message(text){const target=card.querySelector('[role=alert]');if(target)target.textContent=text;}
 function codeCard(){
  showCard();card.innerHTML='<span class="worker-code-icon" aria-hidden="true">✉</span><h2>Check your email</h2><p class="worker-code-caption">Enter the code sent to <strong></strong></p><label>Email code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" placeholder="Enter code" required></label><button type="submit">Verify & continue →</button><p role="alert"></p><button type="button" class="worker-code-back" data-resend>Send another code</button><button type="button" class="worker-code-back" data-back>Back to sign in</button>';
  card.querySelector('strong').textContent=pendingEmail;card.querySelector('[data-back]').onclick=back;
  card.querySelector('[data-resend]').onclick=async()=>{if(busy)return;if(Date.now()-lastSent<60000)return message('Wait one minute before requesting another code.');busy=true;try{await sendCode();message('A new code was sent.');}catch(e){message(e.message);}finally{busy=false;}};
  card.elements.code.focus();
  card.onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const button=card.querySelector('[type=submit]');button.disabled=true;
   try{
    const {data,error}=await auth().verifyOtp({email:pendingEmail,token:card.elements.code.value.trim(),type:'email'});if(error)throw error;
    if(!data?.session||!data?.user||data.user.email?.toLowerCase()!==pendingEmail.toLowerCase())throw Error('Email verification did not complete. Please try again.');
    if(resetMode)passwordCard(data.user);else{card.hidden=true;await window.loadSignedInUser(data.user);}
   }catch(e){message(e.message);}finally{busy=false;button.disabled=false;}
  };
 }
 async function sendCode(){const {error}=await auth().signInWithOtp({email:pendingEmail,options:{shouldCreateUser:false}});if(error)throw error;lastSent=Date.now();}
 async function startCode(reset){
  if(busy)return;const email=document.getElementById('loginEmail');if(!email.value.trim()||!email.checkValidity()){notice.textContent='Enter your account email first.';email.focus();return;}
  busy=true;pendingEmail=email.value.trim();resetMode=reset;notice.textContent='Sending email code…';
  actions.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await sendCode();notice.textContent='';codeCard();}catch(e){notice.textContent=e.message;}finally{busy=false;actions.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 function passwordCard(user,onComplete){
  verifiedUser=user;afterPassword=onComplete||null;showCard();
  card.innerHTML='<span class="worker-code-icon" aria-hidden="true">↳</span><h2>Set your sign-in password</h2><p class="worker-code-caption">Use this password with your account email next time.</p><label>New password<input name="password" type="password" minlength="10" autocomplete="new-password" required></label><label>Confirm password<input name="confirm" type="password" minlength="10" autocomplete="new-password" required></label><button type="submit">Save password & continue →</button><p role="alert"></p>';
  card.elements.password.focus();
  card.onsubmit=async e=>{e.preventDefault();if(busy)return;
   if(card.elements.password.value!==card.elements.confirm.value)return message('The passwords do not match.');
   busy=true;const button=card.querySelector('[type=submit]');button.disabled=true;
   try{
    const {data:current,error:sessionError}=await auth().getUser();if(sessionError)throw sessionError;
    if(current?.user?.id!==verifiedUser.id)throw Error('Your session changed. Verify your email again before setting a password.');
    const {data,error}=await auth().updateUser({password:card.elements.password.value});if(error)throw error;
    if(data?.user?.id!==verifiedUser.id)throw Error('The password change was not confirmed.');
    card.reset();card.hidden=true;const callback=afterPassword;afterPassword=null;
    if(callback)await callback(data.user);else await window.loadSignedInUser(data.user);
   }catch(e){message(e.message);}finally{busy=false;button.disabled=false;}
  };
 }
 actions.querySelector('[data-auth=code]').onclick=()=>startCode(false);
 actions.querySelector('[data-auth=reset]').onclick=()=>startCode(true);
 for(const id of ['workerSignIn','workerApply'])document.getElementById(id)?.addEventListener('click',()=>{if(!busy){card.hidden=true;verifiedUser=null;afterPassword=null;}});
 window.handleRunnerLogin=async()=>{
  if(busy)return;const email=document.getElementById('loginEmail').value.trim(),password=document.getElementById('loginPassword').value;
  if(!email||!password){notice.textContent='Enter your email and password, or use an email code.';return;}
  busy=true;const button=fields.querySelector('button');button.disabled=true;notice.textContent='Signing in…';
  try{const {data,error}=await auth().signInWithPassword({email,password});if(error)throw error;if(!data?.user)throw Error('Sign-in did not complete.');notice.textContent='';document.getElementById('loginPassword').value='';await window.loadSignedInUser(data.user);}
  catch(e){notice.textContent=e.code==='invalid_credentials'||/invalid login credentials/i.test(e.message)?'Email or password was not accepted. Use an email code to sign in, or set/reset your password.':e.message;}
  finally{busy=false;button.disabled=false;}
 };
 window.SwiftTeamAuth={setPassword:passwordCard};
})();
