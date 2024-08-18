<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import Editor from './Editor.vue';
import allFilters from '../lib/filters.js';

const route = useRoute();
const creating = ref(!route.query.slug);
const loading = ref(true);
const agent = apos.login.user.role !== 'guest';
const filters = allFilters.filter(filter => {
  if (!filter.edit) {
    return false;
  }
  if (filter.agent && !agent) {
    return false;
  }
  return true;
});
console.log(filters);
const ticket = reactive({});
const notFound = ref(false);
const choices = reactive({});
for (const filter of filters) {
  choices[filter.name] = [];
}

onMounted(async () => {
  await manageChoices();
  if (creating) {
    // Populated with the defaults
    Object.assign(ticket, await apos.http.post(
      '/api/v1/ticket',
      {
        body: {
          _newInstance: {}
        },
        busy: true
      }
    ));
  } else {
    const { results } = await apos.http.get(
      `/api/v1/ticket?slug=${route.params.slug}`,
      {
        busy: true
      }
    );
    if (!results[0]) {
      notFound.value = true;
      return;
    }
    Object.assign(ticket, results[0]);
    loading = false;
  }
});

async function manageChoices() {
  console.log('** choices defined');
  for (const filter of filters) {
    if (!filter.choices) {
      continue;
    }
    const field = apos.ticket.schema.find(({ name }) => name === filter.name);
    if (field.choices) {
      choices[filter.name] = field.choices;
      continue;
    }
    for (const name of Object.keys(filter.dependencies || {})) {
      watch(() => ticket[name], updateChoices);
    }
    if (!filter.dependencies) {
      await updateChoices();
    }
    async function updateChoices() {
      const qs = {
        ...filter.qs
      };
      for (const [ name, narrowBy ] of Object.entries(filter.dependencies || {})) {
        if (!ticket[name]) {
          choices[filter.name] = [];
          return;
        }
        qs[narrowBy] = ticket[name];
      }
      choices[filter.name] = await getAllChoices(field.withType, qs);
    }
  }
}

async function getAllChoices(type, qs) {
  const choices = [];
  let page = 1;
  while (true) {
    const {
      results,
      pages
    } = await apos.http.get(`/api/v1/${type}`, {
      qs: {
        ...qs,
        project: {
          title: 1
        },
        page,
        perPage: 100
      },
      busy: true,
    });
    if (!results.length) {
      return choices;
    }
    choices.push(...results.map(toChoice));
    page++;
  }
}

async function submit() {
  if (route.params.slug) {
    await apos.http.patch(`/api/v1/ticket/${route.params.slug}`, {
      body: ticket,
      busy: true
    });
  } else {
    await apos.http.post('/api/v1/ticket', {
      body: ticket,
      busy: true
    });
  }
  // Return to whatever filters we had going on
  router.go(-1);
}

function isRequired(filterName) {
  return apos.ticket.schema.some(({ name, required }) => (filterName === name) && required);
}

function toChoice(result) {
  return {
    value: result._id,
    label: result.title
  };
}

function getDisabled(name) {
  console.log(name, choices[name]);
  return choices[name].length === 0;
}

</script>
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
      &gt;
    <RouterLink to="/create">Create Ticket</RouterLink>
  </nav>
  <section v-if="notFound">
    Not Found
  </section>
  <form v-else @submit.prevent="submit">
    <label>
      <span>Title</span>
      <input required v-model="ticket.title" />
    </label>
    <!-- Wrapping contenteditable in a label
     does not work, by design. TODO: click handler
     on the substitute label here to emulate the
     usual focus passing via blatant JS cheating -->
    <div class="editor-wrapper">
      <span>Description</span>
      <Editor v-model="ticket.description" />
    </div>
    <section>
      <label v-for="filter in filters">
        <span>{{ filter.label }}</span>
        <Select :empty="true" :disabled="getDisabled(filter.name)" :required="isRequired(filter.name)" v-model="ticket[filter.name]" :choices="choices[filter.name]" />
      </label>
    </section>
    <button type="submit">Submit</button>
  </form>
</template>

<style scoped>
  nav {
    margin-bottom: 2em;
  }
  label, .editor-wrapper {
    display: flex;
    margin-bottom: 1em;
  }
  label span, .editor-wrapper span {
    width: 240px;
  }
</style>
