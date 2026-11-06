/* Admin navigation only: reuse existing section buttons and handlers. */
(()=>{'use strict';
function boot(){
 const root=document.documentElement,dashboard=document.getElementById('dashboardScreen'),nav=dashboard?.querySelector('.dispatch-navigation'),header=dashboard?.querySelector(':scope > header');
 if(!nav||!header)return;
 const anchor=document.createComment('Workspace navigation');nav.before(anchor);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='aw-menu-toggle';toggle.setAttribute('aria-label','Open workspace menu');toggle.setAttribute('aria-controls','awNavigationDrawer');toggle.setAttribute('aria-expanded','false');
 toggle.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Menu</span>';header.prepend(toggle);
 const drawer=document.createElement('dialog');drawer.id='awNavigationDrawer';drawer.setAttribute('aria-labelledby','awDrawerTitle');
 const top=document.createElement('div');top.className='aw-drawer-top';const title=document.createElement('div');title.innerHTML='<small>SWIFTSHOP</small><h2 id="awDrawerTitle">Workspace</h2>';
 const close=document.createElement('button');close.type='button';close.className='aw-drawer-close';close.setAttribute('aria-label','Close workspace menu');close.textContent='×';top.append(title,close);drawer.append(top);document.body.append(drawer);
 const end=()=>{if(drawer.open)drawer.close();root.classList.remove('aw-menu-open');toggle.setAttribute('aria-expanded','false');};
 const sync=()=>{const isAdmin=root.dataset.workspaceRole==='admin';toggle.hidden=!isAdmin;if(isAdmin){if(nav.parentElement!==drawer)drawer.append(nav);}else{end();if(nav.parentElement===drawer)anchor.after(nav);}};
 toggle.onclick=()=>{if(root.dataset.workspaceRole!=='admin')return;drawer.showModal();root.classList.add('aw-menu-open');toggle.setAttribute('aria-expanded','true');close.focus();};close.onclick=end;
 drawer.addEventListener('close',()=>{root.classList.remove('aw-menu-open');toggle.setAttribute('aria-expanded','false');});
 drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)end();}});
 nav.addEventListener('click',e=>{if(e.target.closest('button[data-page]'))end();});
 window.addEventListener('swift-workspace-page',sync);new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-workspace-role']});sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();