import createApp from 'Modules/@apostrophecms/ui/lib/vue';
import router from '../lib/router.js';

export default function() {
  const component = apos.vueComponents.App;
  const el = document.querySelector('#app');
  if (!el) {
    return;
  }
  createApp(component)
    .use(router)
    .mount(el);
};
