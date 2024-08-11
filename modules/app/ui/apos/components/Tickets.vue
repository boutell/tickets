<script setup>
import { useRouter, useRoute } from 'vue-router'
const router = useRouter();
const route = useRoute();
const props = defineProps({
  organizationSlug: String
});
import { ref, onMounted, watch } from 'vue';
const organizationChoices = ref([]);
const assigneeChoices = ref([]);
const statusChoices = ref([]);
const organizationSlug = ref(null);
const organization = ref(null);
const assigneeId = ref(null);
const page = ref(1);
const status = ref(null);
const tickets = ref([]);
const q = ref('');
const error = ref(false);

onMounted(update);
watch(organizationSlug, () => update);
watch(assigneeId, () => update);
watch(() => status.value, () => update);

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
  <section>
    <Select v-model="organizationSlug" :choices="organizationChoices" label="Organization" />
    <Select v-model="assigneeId" :choices="assigneeChoices" label="Assignee" />
    <Select v-model="status" :choices="statusChoices" label="Status" />
  </section>
</template>
