<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import Pencil from 'vue-material-design-icons/Pencil.vue';
import PencilPlus from 'vue-material-design-icons/PencilPlus.vue';
import { editFilters as filters } from '../lib/filters.js';
import { agent } from '../lib/agent.js';
import Age from './Age.vue';

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

function myComment(comment) {
  return comment._author?.[0]?._id === apos.login.user._id;
}

async function deleteComment(comment) {
  await apos.http.delete(`/api/v1/comment/${comment._id}`, {
    busy: true
  });
  ticket._comments = ticket._comments.filter(c => c._id !== comment._id);
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
    <section class="comments">
      <h2>Comments</h2>
    </section>
    <div class="actions">
      <RouterLink :to="`/ticket/${ticket.ticketNumber}/comment/create`"><PencilPlus /> New Comment</RouterLink>
    </div>
    <article v-for="comment in ticket._comments">
      <h4>
        {{ comment._author?.[0]?.title || 'unknown' }}
        <RouterLink v-if="myComment(comment)" :to="`/ticket/${ticket.ticketNumber}/comment/${ticket._id}/edit`"><Pencil /> Edit</RouterLink>
        <a v-if="agent" @click.prevent="deleteComment(comment._id)">x Delete</a>
      </h4>
      <h5><Age :at="comment.createdAt" /> ago</h5>
      <div class="user-content" v-html="comment.text">
      </div>
    </article>
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
