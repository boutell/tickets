<script setup>
import { ref, watch } from 'vue';
const model = defineModel();
const props = defineProps({
  choices: Array,
  label: String
});
console.log('hi mom');
const value = ref(model.value || '');
watch(value, () => {
  console.log('fired');
  model.value = value.value;
});
</script>

<template>
  <select v-model="value">
    <option
      value=""
    >
      {{ label }}
    </option>
    <option
      v-for="choice in choices"
      :value="choice.value"
    >
      {{ choice.label }}
    </option>
  </select>
</template>
