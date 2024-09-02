<template>
  <span :title="dayjs(at).format('YYYY-MM-DD hh:mma')">{{ dayjs(at).fromNow(true) }}</span>
</template>
<script setup>
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
const props = defineProps({
  at: {
    type: String
  }
});
</script>
