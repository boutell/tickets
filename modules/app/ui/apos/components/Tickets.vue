<script setup>
import { useRouter, useRoute, RouterLink } from 'vue-router';
import Age from './Age.vue';
import PencilPlus from 'vue-material-design-icons/PencilPlus.vue';
import filters from '../lib/filters.js';

const router = useRouter();
const route = useRoute();
const props = defineProps({
  organizationSlug: String
});
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';

const tickets = ref([]);
const loading = ref(true);
let bottom = false;
let spyIsVisible = false;
let queryTimeout = null;

// 0 = "haven't tried to load page one yet, so
// don't start the infinite scroll attempts yet"
const page = ref(0);
let infiniteScrollObserver;

onMounted(() => {
  page.value = 1;
  updateData();
});
onMounted(startInfiniteScroll);
onUnmounted(endInfiniteScroll);

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
  // Filter changes do not make a history entry,
  // but they are bookmarkable URLs
  router.replace({
    path: '/',
    query
  });
}

function clearRouteQuery() {
  router.replace({
    path: '/'
  });
}

watch(route, () => {
  clearTimeout(queryTimeout);
  queryTimeout = setTimeout(() => {
    queryTimeout = null;
    page.value = 1;
    for (const filter of filters) {
      filter.current.value = route.query[filter.name] || '';
    }
    updateData();
  }, 250);
});

async function updateData() {
  loading.value = true;
  const allChoices = [];
  const qs = (page.value === 1) ? {
    choices: allChoices
  } : {};
  qs.page = page.value;
  for (const { name, dependencies } of filters) {
    if (route.query[name]) {
      qs[name] = route.query[name];
    }
  }
  if (page.value === 1) {
    for (const { name, choices, dependencies } of filters) {
      if (choices) {
        if (!Object.keys(dependencies || {}).some(name => !route.query[name])) {
          allChoices.push(name);
        }
      }
    }
  }
  const response = await apos.http.get('/api/v1/ticket', {
    qs
  });

  if (queryTimeout) {
    // We should cause no state changes, we have
    // already started a new query that will
    // replace this one
    return;
  }

  // Synchronous state changes
  if (bottom === 1) {
    bottom = false;
  }
  if (!response.results.length) {
    bottom = true;
  } else {
    if (page.value === 1) {
      tickets.value = response.results;
    } else {
      tickets.value.push(...response.results);
    }
  }
  if (response.choices) {
    for (const { name, choices } of filters) {
      if (choices) {
        choices.value = response.choices[name];
      }
    }
  }
  loading.value = false;

  if (!bottom) {
    // After rendering what we just got, we can look
    // at whether the spy is still visible
    nextTick(handleInfiniteScroll);
  }
}

function startInfiniteScroll() {
  const spy = document.querySelector('#spy');
  infiniteScrollObserver = new IntersectionObserver(handleInfiniteScroll);
  infiniteScrollObserver.observe(spy);
}

function endInfiniteScroll() {
  infiniteScrollObserver.disconnect();
}

function handleInfiniteScroll(entries) {
  if (entries) {
    spyIsVisible = entries[0].isIntersecting;
  }
  if (!spyIsVisible) {
    return;
  }
  if (page.value === 0) {
    // Let the loading of page 1 begin before
    // we even think about this
    return;
  }
  if (loading.value) {
    // Debounce (it'll check again automatically
    // after loading each page)
    return;
  }
  if (bottom) {
    return;
  }
  page.value++;
  updateData();
}
</script>
<template>
  <nav class="primary-nav">
    Tickets
  </nav>
  <section>
    <div class="actions">
      <RouterLink to="/ticket/create"><PencilPlus /> New Ticket</RouterLink>
    </div>
    <section>
      <label v-for="filter in labeled">
        <span>{{ filter.label }}</span>
        <Select v-if="filter.type !== 'autocomplete'" :empty="true" :disabled="!filter.choices.value?.length" v-model="filter.current.value" :choices="filter.choices.value" />
        <input v-else v-model="filter.current.value" />
      </label>
      <button class="clear" v-if="Object.keys(route.query).length > 0" @click="clearRouteQuery">Clear Filters</button>
    </section>
    <section>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Age</th><th>Customer</th><th>Subject</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ticket in tickets" :key="ticket._id">
            <td>
              <RouterLink :to="`/ticket/${ticket.ticketNumber}`">
                {{ ticket.ticketNumber }}
              </RouterLink>
            </td>
            <td class="age">
              <RouterLink :to="`/ticket/${ticket.ticketNumber}`">
                <Age :at="ticket.createdAt" />
              </RouterLink>
            </td>
            <td class="customer">
              <RouterLink :to="`/ticket/${ticket.ticketNumber}`">
                {{ ticket._customer[0].title }}
              </RouterLink>
            </td>
            <td>
              <RouterLink :to="`/ticket/${ticket.ticketNumber}`">
                {{ ticket.title }}
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<style scoped>
.actions {
  margin: 1em 0;
}
thead {
  border-bottom: 1px solid black;
  margin-bottom: 4px;
}
th {
  text-align: left;
}
td, th {
  padding-bottom: 0.5em;
}
th:not(:first-child), td:not(:first-child) {
  padding-left: 16px;
}
.age {
  min-width: 6em;
}
.customer {
  min-width: 10em;
}
label {
  display: flex;
  margin-bottom: 1em;
}
label span {
  width: 240px;
}
.clear {
  display: block;
  margin-bottom: 1em;
}
</style>
