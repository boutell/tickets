<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import Editor from './Editor.vue';
import allFilters from '../lib/filters.js';

const router = useRouter();
const route = useRoute();
const creating = ref(!route.params.number);
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
console.log(`* ${filters.length}`);
const ticket = reactive({});
const notFound = ref(false);
const choices = reactive({});
for (const filter of filters) {
  choices[filter.name] = [];
}

onMounted(async () => {
  if (creating.value) {
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
    try {
      Object.assign(ticket, await apos.http.get(
        `/api/v1/ticket/ticket${route.params.number}`,
        {
          busy: true
        }
      ));
    } catch (e) {
      if (e.status === 404) {
        notFound.value = true;
      } else {
        throw e;
      }
    }
  }
  for (const filter of filters) {
    if (filter.relationship) {
      if (!filter.multiple) {
        console.log(`** ${filter.name}`);
        ticket[filter.name] = ticket[filter.name]?.[0]?._id;
      } else {
        console.log(`*** ${filter.name}`);
        ticket[filter.name] = (ticket[filter.name] || []).map(value => value._id);
      }
    }
  }
  await manageChoices();
  loading.value = false;
});

async function manageChoices() {
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
    await updateChoices();
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
      // TODO abstract this filter away to an $or on the server
      // side, for now it's a hack here on the client side
      if (qs.organizationsOrAgent) {
        choices[filter.name] = [
          ...await getAllChoices(field.withType, {
            _organizations: qs.organizationsOrAgent
          }),
          ...await getAllChoices(field.withType, {
            role: [ 'editor', 'admin' ]
          })
        ];
      } else {
        choices[filter.name] = await getAllChoices(field.withType, qs);
      }
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
  const body = {
    ...ticket
  };
  for (const filter of filters) {
    if (!filter.relationship) {
      continue;
    }
    const value = ticket[filter.name];
    console.log(`>> ${filter.name}`);
    console.log(`>>> ${JSON.stringify(value)}`);
    if (!filter.multiple) {
      body[filter.name] = value ? [ { _id: value } ] : [];
    } else {
      body[filter.name] = value.map(value => ({ _id: value }));
    }
    console.log(`>>>> ${JSON.stringify(body[filter.name])}`);
  }
  let result = ticket._id ?
    await apos.http.patch(`/api/v1/ticket/${ticket._id}`, {
      body,
      busy: true
    })
  : await apos.http.post('/api/v1/ticket', {
      body,
      busy: true
    })
  ;
  const number = result._id.replace('ticket', '');
  router.push({
    path: `/ticket/${number}`
  });
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
  return choices[name].length === 0;
}

</script>
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
      &gt;
    <RouterLink :to="`/ticket/${route.params.number }`">{{ ticket.title }}</RouterLink>
    <RouterLink :to="`/ticket/${route.params.number }/edit`">Edit</RouterLink>
  </nav>
  <section v-if="notFound">
    Not Found
  </section>
  <section v-else-if="loading">
    Loading...
  </section>
  <form v-else @submit.prevent="submit">
    <label>
      <span>Title</span>
      <input required v-model="ticket.title" />
    </label>
    <section>
      <label v-for="filter in filters">
        <span>{{ filter.label }}</span>
        <SelectMultiple v-if="filter.multiple" :disabled="getDisabled(filter.name)" v-model="ticket[filter.name]" :choices="choices[filter.name]" />
        <Select v-else :empty="true" :disabled="getDisabled(filter.name)" :required="isRequired(filter.name)" v-model="ticket[filter.name]" :choices="choices[filter.name]" />
      </label>
    </section>
    <!-- Wrapping contenteditable in a label
     does not work, by design. TODO: click handler
     on the substitute label here to emulate the
     usual focus passing via blatant JS cheating -->
     <div class="editor-wrapper">
      <span>Description</span>
      <Editor v-model="ticket.description" />
    </div>
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
    span {
      width: 240px;
    }
  }
</style>
