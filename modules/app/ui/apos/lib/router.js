import { createWebHistory, createRouter } from 'vue-router';

import Tickets from 'Modules/app/components/Tickets.vue';
import Ticket from 'Modules/app/components/Ticket.vue';

const routes = [
  { path: '/', component: Tickets },
  { path: '/ticket/:slug', component: Ticket },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
