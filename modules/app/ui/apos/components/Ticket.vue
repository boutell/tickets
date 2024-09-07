<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import Pencil from 'vue-material-design-icons/Pencil.vue';
import { editFilters as filters } from '../lib/filters.js';
import Age from './Age.vue';
import Comments from './Comments.vue';

const ticket = ref(null);
const notFound = ref(false);
const route = useRoute();

onMounted(async () => {
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
    ticket.value = value;
  }
});

function getLabel(name) {
  const value = ticket.value[name];
  const choices = apos.ticket.schema.find(field => field.name === name).choices;
  return choices.find(choice => choice.value === value)?.label || '';
}
</script>
<template>
  <nav class="primary-nav">
    <RouterLink to="/">Tickets</RouterLink>
    &nbsp;
    »
    &nbsp;
    <span v-if="ticket">
      #{{ ticket.ticketNumber }} {{ ticket.title }}
    </span>
    &nbsp;
    <RouterLink v-if="ticket?._edit" :to="`/ticket/${route.params.number }/edit`">
      <Pencil title="Edit" />
    </RouterLink>
  </nav>
  <article v-if="ticket">
    <section class="ticket">
      <div class="field">
        <span class="label">Title</span>
        <span class="value">{{ ticket.title }}</span>
      </div>
      <div class="field">
        <span class="label">Age</span>
        <span class="value"><Age :at="ticket.createdAt" /></span>
      </div>
      <div class="field" v-for="filter in filters">
        <span class="label">{{ filter.label }}</span>
        <ul class="value" v-if="Array.isArray(ticket[filter.name])">
          <li v-for="value of ticket[filter.name]">
            {{ value.title }}
          </li>
        </ul>
        <span class="value" v-else>{{ getLabel(filter.name) }}</span>
      </div>
    </section>
    <Comments
      :ticket-number="ticket.ticketNumber"
      :ticket-id="ticket._id"
      :comments="ticket._comments"
    />
  </article>
  <article v-else-if="notFound">
    <h2>Not Found</h2>
    <p>This ticket might not exist, or it may have been archived.</p>
  </article>
  <article v-else>
    <p>Loading...</p>
  </article>
</template>
<style lang="scss" scoped>
@import '../lib/styles/user-content.scss';

nav {
  margin-bottom: 2em;
}

:deep(.user-content) {
  @include user-content;
}

// matches label in EditTicket.vue
.field {
  display: flex;
  margin-bottom: 1em;
  span.label {
    width: 240px;
  }
}
// matches SelectMultiple
ul {
  margin-block-start: 0;
  margin-block-end: 0;
  padding-inline-start: 0;
  list-style: none;
}
</style>
