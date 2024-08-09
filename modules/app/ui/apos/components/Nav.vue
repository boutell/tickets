<script setup>
import { useRouter, useRoute } from 'vue-router'
import { ref, reactive, watch, onMounted } from 'vue';
const router = useRouter();
const route = useRoute();
const organizationChoices = reactive([]);

const organizationSlug = ref(null);
onMounted(async () => {
  const choices = (await apos.http.get('/api/v1/organization', {
    busy: true,
    qs: {
      project: {
        title: 1,
        slug: 1
      }
    }
  })).results;
  for (const choice of choices) {
    organizationChoices.push(choice);
  }
});
watch(organizationSlug, () => {
  if (organizationSlug.value) {
    router.push(`/org/${organizationSlug.value}`);
  }
});
watch(() => route.params, () => organizationSlug.value = route.params.organizationSlug);
</script>
<template>
  <select v-model="organizationSlug">
    <option v-for="choice in organizationChoices" :value="choice.slug">
      {{ choice.title }}
    </option>
  </select>
</template>
