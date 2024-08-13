<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
const ticket = ref(null);
const notFound = ref(false);
const router = useRouter();
const route = useRoute();
onMounted(async () => {
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
  ticket.value = results[0];
});

</script>
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
      &gt;
    <RouterLink v-if="ticket" :to="`/ticket/${route.params.slug }`">{{ ticket.title }}</RouterLink>
  </nav>
  <article v-if="ticket">
    <h2>{{ ticket.title }}</h2>
    <div>
      <!-- TODO render markdown safely -->
      {{ ticket.description }}
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
