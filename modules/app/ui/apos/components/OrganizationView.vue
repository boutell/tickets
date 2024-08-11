<script setup>
const props = defineProps({
  organizationSlug: String
});
import { ref, onMounted, watch } from 'vue';
const organization = ref(null);
const assignee = ref(null);
const status = ref(null);
const tickets = ref([]);
const search = ref('');
const error = ref(false);
onMounted(updateOrg);
watch(() => props.organizationSlug, updateOrg);
watch(() => )
async function updateOrg() {
  const { results } = await apos.http.get('/api/v1/organization', {
    busy: true,
    qs: {
      slug: props.organizationSlug
    }
  });
  if (!results[0]) {
    error.value = true;
  }
  organization.value = results[0];
  error.value = false;
  await updateTickets();
}
async function updateTickets() {
  const filters = {};
  if (assignee.value) {
    filters._assignee = assignee.value;
  }
  if (status.value) {
    filters.status = status.value;
  }
  if (search.value) {
    filters.q = search.value;
  }
  const { results } = await apos.http.get('/api/v1/tickets', {
    busy: true,
    qs: {
      _organization: organization.value._id,
      ...filters
    }
  });
  tickets.value = results;
}
</script>
<template>
  <h2 v-if="error">Not Found</h2>
  <h2 v-else-if="organization?.slug !== organizationSlug">Loading organization...</h2>
  <section v-else>
    <h2>{{ organization.title }}</h2>
  </section>
</template>
