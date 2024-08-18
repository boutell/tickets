<script setup>
import { ref, watch } from 'vue';
const model = defineModel();
const props = defineProps({
  choices: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: () => false
  },
  addLabel: {
    type: String,
    default: () => '+ Add'
  }
});

watch(() => props.choices, () => {
  // Noncomformant values should be purged when choices change,
  // as happens in single select
  model.value = model.value.filter(value => props.choices.some(choice => choice.value === value));
});

const adding = ref('');
// Useful when you need to distinguish user changes
// from your own changes caused by 2-way binding
const emit = defineEmits([ 'userChange' ]);

function remaining() {
  console.log('recomputing remaining');
  const result = props.choices.filter(choice => !model.value.includes(choice.value));
  console.log('RESULT:', JSON.stringify(result, null, '  '));
  return result;
}

function add() {
  model.value.push(adding.value);
  adding.value = '';
  emit('userChange');
}

function remove(value) {
  model.value = model.value.filter(item => item !== value);
  emit('userChange');
}

function getLabel(value) {
  console.log(`Getting label for ${value}`);
  const choice = props.choices.find(choice => choice.value === value);
  console.log('Choice is:', choice);
  return choice.label;
}

function validSelections() {
  // Because reactivity can render before our watcher
  // purges invalid values
  return model.value.filter(value => props.choices.some(choice => choice.value === value));
}
</script>

<template>
  <div class="wrapper">
    <ul>
      <li v-for="item of validSelections()">
        {{ getLabel(item) }}
        <a v-if="!disabled" @click="remove(item)">x</a>
      </li>
      <li v-if="remaining().length > 0">
        <Select
          :disabled="disabled"
          v-model="adding"
          @user-change="add"
          :choices="remaining()"
          :empty="true"
          :empty-label="addLabel"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
li {
  margin-bottom: 0.5em;
}
</style>
