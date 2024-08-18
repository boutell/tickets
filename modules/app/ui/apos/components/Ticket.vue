<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { marked } from 'marked';
const ticket = ref(null);
const notFound = ref(false);
const route = useRoute();

onMounted(async () => {
  try {
    ticket.value = await apos.http.get(
      `/api/v1/ticket/ticket${route.params.number}`,
      {
        busy: true
      }
    );
  } catch (e) {
    if (e.status === 404) {
      notFound.value = true;
    } else {
      throw e;
    }
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
