<template>
  <label :disabled="disabled" :class="class">
    <input type="file" @change="change" />
    <slot></slot>
  </label>
</template>

<script setup>
const props = defineProps({
  disabled: {
    type: Boolean,
    default: () => false
  },
  class: {
    type: [ String, Object ],
    default: () => ''
  }
});

const emit = defineEmits(['click']);

async function change(e) {
  const file = e.target.files?.[0];
  if (!file) {
    return;
  }
  e.target.value = '';
  const formData = new FormData();
  formData.append('file', file);
  try {
    const attachment = await apos.http.post('/api/v1/@apostrophecms/attachment/upload', {
      body: formData,
      busy: true
    });
    emit('click', attachment);
  } catch (e) {
    console.error(e);
    alert('File upload error, try a smaller file');
  }
}
</script>

<style lang="scss" scoped>
label {
  display: flex;
}
input[type="file"] {
  display: none;
}
</style>
