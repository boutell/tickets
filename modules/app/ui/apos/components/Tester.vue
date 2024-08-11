<script setup>
import { ref, watch } from 'vue';
const value = ref(null);
watch(value, () => {
  console.log(`New value is: ${value.value}`);
});
</script>
<template>
<Select
  v-model="value"
  label="Choose One"
  :choices="[ { label: 'One', value: '1' }, { label: 'Two', value: '2' } ]"
</Select>
</template>
