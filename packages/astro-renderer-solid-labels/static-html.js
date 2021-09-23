import { createComponent } from 'solid-js';

console.log('Loaded static html');

/**
 * Astro passes `children` as a string of HTML, so we need
 * a wrapper `astro-fragment` to render that content as VNodes.
 */
const StaticHtml = ({ innerHTML }) => {
  if (!innerHTML) return null;
  return () => createComponent('astro-fragment', { innerHTML });
};

export default StaticHtml;
