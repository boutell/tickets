<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { marked } from 'marked';
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

function render(markdown) {
  return marked.parse(markdown);
}

</script>
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
      &gt;
    <RouterLink v-if="ticket" :to="`/ticket/${route.params.number }`">{{ ticket.title }}</RouterLink>
    <RouterLink v-if="ticket?._edit" :to="`/ticket/${route.params.number }/edit`">Edit</RouterLink>
  </nav>
  <article v-if="ticket">
    <h2>{{ ticket.title }}</h2>
    <div v-html="render(ticket.description)"
    </div>
  </article>
  <article v-else-if="notFound">
    <h2>Not Found</h2>
    <p>This ticket might not exist, or it may have been archived.</p>
  </article>
  <article v-else>
    <p>Loading...</p>
  </article>
</template>
