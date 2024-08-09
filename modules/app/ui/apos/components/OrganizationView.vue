<script setup>
const props = defineProps({
  organizationSlug: String
});
import { ref, onMounted, watch } from 'vue';
const organization = ref(null);
const error = ref(false);
onMounted(updateOrg);
watch(() => props.organizationSlug, updateOrg);
async function updateOrg() {
  console.log('fetching org');
  const { results } = await apos.http.get('/api/v1/organization', {
    busy: true,
    qs: {
      slug: props.organizationSlug
    }
  });
  if (!results[0]) {
    console.log('setting error');
    error.value = true;
  }
  console.log('setting value');
  organization.value = results[0];
  error.value = false;
}
</script>
<template>
  <h2 v-if="error">Not Found</h2>
  <h2 v-else-if="organization?.slug === organizationSlug">{{ organization.title }}</h2>
  <h2 v-else>...</h2>
</template>
