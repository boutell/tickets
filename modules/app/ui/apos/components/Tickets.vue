<script setup>
import { useRouter, useRoute, RouterLink } from 'vue-router'
const router = useRouter();
const route = useRoute();
const props = defineProps({
  organizationSlug: String
});
import { ref, onMounted, watch } from 'vue';

const tickets = ref([]);
const error = ref(false);
const loading = ref(true);

onMounted(updateData);

const filters = [
  {
    name: 'organization',
    choices: ref([]),
    label: 'Organization'
  },
  {
    name: '_assignee',
    choices: ref([]),
    label: 'Assignee'
  },
  {
    name: 'status',
    choices: ref([]),
    label: 'Status'
  },
  {
    name: 'page'
  },
  {
    name: 'q'
  }
];

for (const filter of filters) {
  filter.current = ref(route.query[filter.name] || '');
}

const labeled = filters.filter(filter => !!filter.label);

for (const { name, current } of filters) {
  watch(current, updateRouteQuery);
}

function updateRouteQuery() {
  console.log('in updateRouteQuery');
  const query = {};
  for (const { name, current } of filters) {
    if (current.value) {
      query[name] = current.value;
    }
  }
  router.push({
    path: '/',
    query
  });
}

watch(route, updateData);

async function updateData() {
  console.log('in update');
  loading.value = true;
  const allChoices = [];
  const qs = {
    choices: allChoices
  };
  for (const { name } of filters) {
    if (route.query[name]) {
      qs[name] = route.query[name];
    }
  }
  for (const { name, choices } of filters) {
    if (choices) {
      allChoices.push(name);
    }
  }
  const response = await apos.http.get('/api/v1/ticket', {
    qs,
    busy: true
  });
  tickets.value = response.results;
  for (const { name, choices } of filters) {
    if (choices) {
      choices.value = response.choices[name];
    }
  }
  loading.value = false;
}

</script>
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
  </nav>
  <section v-if="loading">
    Loading...
  </section>
  <section v-else>
    <section>
      <label v-for="filter in labeled">
        {{ filter.label }}
        <Select v-model="filter.current.value" :choices="filter.choices.value" />
      </label>
    </section>
    <section>
      <ul v-for="ticket in tickets">
        <li><RouterLink :to="`/ticket/${ticket.slug}`">{{ ticket.title }}</RouterLink></li>
      </ul>
    </section>
  </section>
</template>
