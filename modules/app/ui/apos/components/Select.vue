<script setup>
import { ref, watch } from 'vue';
const model = defineModel();
const props = defineProps({
  choices: Array,
  label: String
});
</script>

<template>
  <select v-model="model">
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
