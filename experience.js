// Motion is optional. Static SVG, native details and all CTAs work without it.
const story = document.querySelector('.ccr-story');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
if (story && 'IntersectionObserver' in window) {
  let visible = false, frame = 0;
  const update = () => {
    frame = 0;
    if (!visible || preference.matches || document.hidden) return;
    const box = story.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - box.top) / (innerHeight + box.height)));
    story.style.setProperty('--story-progress', progress.toFixed(3));
  };
  const schedule = () => { if (!frame && visible && !preference.matches) frame = requestAnimationFrame(update); };
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    story.classList.toggle('is-tracking', visible && !preference.matches);
    schedule();
  });
  observer.observe(story);
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  preference.addEventListener('change', () => {
    story.classList.toggle('is-tracking', visible && !preference.matches);
    if (preference.matches) {
      cancelAnimationFrame(frame); frame = 0;
      story.style.removeProperty('--story-progress');
    } else schedule();
  });
  document.addEventListener('visibilitychange', schedule);
}
