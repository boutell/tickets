z<script setup>
import { watch } from 'vue';
const model = defineModel();
// Useful when you need to distinguish user changes
// from your own changes caused by 2-way binding
const emit = defineEmits([ 'userChange' ]);
const props = defineProps({
  required: {
    type: Boolean,
    default: () => false
  },
  multiple: {
    type: Boolean,
    default: () => false
  },
  choices: Array,
  disabled: {
    type: Boolean,
    default: () => false
  },
  empty: {
    type: Boolean,
    default: () => false
  },
  emptyLabel: {
    type: String,
    default: () => '--'
  }
});
watch(() => props.choices, () => {
  selectOnlyChoice();
});
selectOnlyChoice();

function selectOnlyChoice() {
  if (props.choices) {
    if (props.choices.length === 1) {
      if (model.value !== props.choices[0].value) {
        model.value = props.choices[0].value;
      }
    }
  }
}
</script>

<template>
  <select :required="required" v-model="model" @change="emit('userChange')">
    <option v-if="empty"
      value=""
    >
      {{ emptyLabel }}
    </option>
    <option
      v-for="choice in choices"
      :key="choice.value"
      :value="choice.value"
    >
      {{ choice.label }}
    </option>
  </select>
</template>
