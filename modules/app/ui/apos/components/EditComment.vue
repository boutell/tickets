<template>
  <form @submit.prevent="save">
    <Editor class="editor" v-model="text" />
    <div class="actions">
      <button @click.prevent="emit('cancel')">Cancel</button>
      &nbsp;
      <button type="submit">{{ comment ? 'Update' : 'Send' }}</button>
    </div>
  </form>

</template>

<script setup>
import { ref } from 'vue';
import Editor from './Editor.vue';
const props = defineProps({
  comment: {
    type: Object,
    required: false
  }
});
const text = ref(props.comment?.text || '');
const emit = defineEmits([ 'cancel', 'save' ]);
function save() {
  emit('save', {
    ...(props.comment || {}),
    text: text.value
  });
}
</script>
