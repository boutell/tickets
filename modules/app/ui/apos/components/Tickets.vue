<script setup>
import { useRouter, useRoute, RouterLink } from 'vue-router';
import filters from '../lib/filters.js';
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

for (const filter of filters) {
  filter.current = ref(route.query[filter.name] || '');
}

const labeled = filters.filter(filter => !!filter.label);

for (const { name, current } of filters) {
  watch(current, updateRouteQuery);
}

function updateRouteQuery() {
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
  loading.value = true;
  const allChoices = [];
  const qs = {
    choices: allChoices
  };
  for (const { name, dependencies } of filters) {
    if (route.query[name]) {
      qs[name] = route.query[name];
    }
  }
  for (const { name, choices, dependencies } of filters) {
    if (choices) {
      if (!Object.keys(dependencies || {}).some(name => !route.query[name])) {
        allChoices.push(name);
      }
    }
  }
  const response = await apos.http.get('/api/v1/ticket', {
    qs,
    busy: true
  });
  tickets.value = response.results;
  for (const { name, choices } of filters) {
    if (choices) {
      console.log(name, response.choices[name]);
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
    <nav>
      <RouterLink to="/ticket/create">+ Create Issue</RouterLink>
    </nav>
    <section>
      <label v-for="filter in labeled">
        <span>{{ filter.label }}</span>
        <Select :empty="true" :disabled="!filter.choices.value?.length" v-model="filter.current.value" :choices="filter.choices.value" />
      </label>
    </section>
    <section>
      <ul v-for="ticket in tickets">
        <li><RouterLink :to="`/ticket/${ticket._id.substring(6)}`">{{ ticket.title }}</RouterLink></li>
      </ul>
    </section>
  </section>
</template>

<style sfoped>
label {
  display: flex;
  margin-bottom: 1em;
}
label span {
  width: 240px;
}
</style>
