import { createWebHistory, createRouter } from 'vue-router';

import HomeView from 'Modules/app/components/HomeView.vue';
import OrganizationView from 'Modules/app/components/OrganizationView.vue';

const routes = [
  { path: '/', component: HomeView },
  { path: '/org/:organizationSlug', component: OrganizationView, props: true }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
