(() => {
  const pop = document.querySelector('[data-testid=strip-menu-pop]');
  const back = pop.querySelector('[data-testid=strip-menu-back]');
  const row = back.cloneNode(true); row.removeAttribute('href'); row.setAttribute('data-testid','strip-menu-guide');
  row.querySelector('span[aria-hidden]').innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><circle cx="12" cy="16.9" r=".6" fill="currentColor"/></svg>';
  const t = row.querySelectorAll('span.min-w-0 > span'); t[0].textContent = "What's what"; t[1].textContent = "What each button and badge does.";
  pop.style.display = 'flex'; pop.style.flexDirection = 'column'; pop.style.gap = '6px';
  pop.prepend(row); back.blur();
  row.style.boxShadow = 'inset 0 0 0 1px var(--border-strong)';
})()
