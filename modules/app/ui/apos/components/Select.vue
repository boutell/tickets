<script setup>
import { ref, watch } from 'vue';
const model = defineModel();
const props = defineProps({
  choices: Array,
  emptyLabel: {
    type: String,
    default: () => '--'
  }
});
</script>

<template>
  <select v-model="model">
    <option
      value=""
    >
      {{ emptyLabel }}
    </option>
    <option
      v-for="choice in choices"
      :value="choice.value"
    >
      {{ choice.label }}
    </option>
  </select>
</template>
