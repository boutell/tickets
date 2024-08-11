import { createWebHistory, createRouter } from 'vue-router';

import Tickets from 'Modules/app/components/Tickets.vue';

const routes = [
  { path: '/', component: Tickets }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
