<script setup>
import { ref, watch } from 'vue';
const model = defineModel();
const props = defineProps({
  required: {
    type: Boolean,
    default: () => false
  },
  choices: Array,
  disabled: {
    type: Boolean,
    default: () => false
  },
  emptyLabel: {
    type: String,
    default: () => '--'
  }
});
</script>

<template>
  <select :disabled :required="required" v-model="model">
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
