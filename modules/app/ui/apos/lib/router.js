import { createWebHistory, createRouter } from 'vue-router';

import Tickets from 'Modules/app/components/Tickets.vue';
import Ticket from 'Modules/app/components/Ticket.vue';
import EditTicket from 'Modules/app/components/EditTicket.vue';

const routes = [
  { path: '/', component: Tickets },
  { path: '/ticket/:slug', component: Ticket },
  { path: '/create', component: EditTicket },
  { path: '/edit', component: EditTicket }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
