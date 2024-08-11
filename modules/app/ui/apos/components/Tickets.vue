<script setup>
import { useRouter, useRoute, RouterLink } from 'vue-router'
const router = useRouter();
const route = useRoute();
const props = defineProps({
  organizationSlug: String
});
import { ref, onMounted, watch } from 'vue';
const organizationChoices = ref([]);
const assigneeChoices = ref([]);
const statusChoices = ref([]);
const organizationSlug = ref('');
const organization = ref(null);
const assigneeId = ref('');
const page = ref(1);
const status = ref('');
const tickets = ref([]);
const q = ref('');
const error = ref(false);

onMounted(update);
watch(organizationSlug, update);
watch(assigneeId, update);
watch(status, update);

async function update() {
  console.log('in update');
  const choices = [ 'organization', '_assignee', 'status' ];
  const qs = {
    choices,
    page
  };
  if (organizationSlug.value) {
    qs.organization = organizationSlug.value;
  }
  if (assigneeId.value) {
    qs._assignee = assigneeId.value;
  }
  if (status.value) {
    qs.status = status.value;
  }
  if (q.value) {
    qs.q = q.value;
  }
  const response = await apos.http.get('/api/v1/ticket', {
    qs,
    busy: true
  });
  tickets.value = response.results;
  organizationChoices.value = response.choices.organization;
  assigneeChoices.value = response.choices._assignee;
  statusChoices.value = response.choices.status;
}

// watch(() => route.params, () => organizationSlug.value = route.params.organizationSlug);
// router.push(`/org/${organizationSlug.value}`);

</script>
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
  </nav>
  <section>
    <label>
      Organization
      <Select v-model="organizationSlug" :choices="organizationChoices" />
    </label>
    <label>
      Assignee
      <Select v-model="assigneeId" :choices="assigneeChoices" />
    </label>
    <label>
      Status
      <Select v-model="status" :choices="statusChoices" />
    </label>
  </section>
  <section>
    <ul v-for="ticket in tickets">
      <li><RouterLink :to="`/ticket/${ticket.slug}`">{{ ticket.title }}</RouterLink></li>
    </ul>
  </section>
</template>
