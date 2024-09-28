<template>
  <nav class="primary-nav">
    <RouterLink to="/">Tickets</RouterLink>
    &nbsp;
    »
    &nbsp;
    <span v-if="ticket">
      <span v-if="ticket.ticketNumber">
        #{{ ticket.ticketNumber }} {{ ticket.title }}
        &nbsp;
        <Pencil title="Edit" />
      </span>
      <span v-else>New Ticket</span>
    </span>
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
      <Editor class="editor" v-model="ticket.description" />
    </div>
    <button @click="cancel">Cancel</button>
    &nbsp;
    <button type="submit">Submit</button>
  </form>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import Pencil from 'vue-material-design-icons/Pencil.vue';
import { editFilters as filters } from '../lib/filters.js';

const router = useRouter();
const route = useRoute();
const creating = ref(!route.params.number);
const loading = ref(true);
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
    const value = (await apos.http.get(
      '/api/v1/ticket',
      {
        qs: {
          ticketNumber: route.params.number
        },
        busy: true
      }
    )).results[0];
    if (!value) {
      notFound.value = true;
    } else {
      Object.assign(ticket, value);
    }
  }
  for (const filter of filters) {
    if (filter.relationship) {
      if (!filter.multiple) {
        ticket[filter.name] = ticket[filter.name]?.[0]?._id;
      } else {
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
    if (!filter.multiple) {
      body[filter.name] = value ? [ { _id: value } ] : [];
    } else {
      body[filter.name] = value.map(value => ({ _id: value }));
    }
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
  const number = result.ticketNumber;
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

function cancel() {
  const viewUrl = `/ticket/${ticket.ticketNumber}`;
  if (history.state.back === viewUrl) {
    history.go(-1);
  } else {
    history.push(viewUrl);
  }
}

</script>

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
