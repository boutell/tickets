<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import Pencil from 'vue-material-design-icons/Pencil.vue';

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
</script>
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    &nbsp;
    :
    &nbsp;
    <span v-if="ticket">
      {{ ticket.title }}
    </span>
    &nbsp;
    <RouterLink v-if="ticket?._edit" :to="`/ticket/${route.params.number }/edit`">
      <Pencil title="Edit" />
    </RouterLink>
  </nav>
  <article v-if="ticket">
    <h2>{{ ticket.title }}</h2>
    <div v-html="ticket.description"
    </div>
    <section class="comments">
      <h2>Comments</h2>
    </section>
    <article v-for="comment in ticket._comments">
      <h4>{{ comment._author?.[0]?.title || 'unknown' }}</h4>
      <div v-html="comment.text">
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
