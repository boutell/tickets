<template>
<section class="comments">
<h2>Comments</h2>
<div class="actions">
  <RouterLink :to="`/ticket/${ticketNumber}/comment/create`"><PencilPlus /> New Comment</RouterLink>
</div>
<article v-for="comment in comments">
  <h4>
    {{ comment._author?.[0]?.title || 'unknown' }}
    <a v-if="myComment(comment) && (!editing)" @click.prevent="editComment(comment._id)"><Pencil /> Edit</a>
    <a v-if="agent || myComment(comment)" @click.prevent="deleteComment(comment._id)">x Delete</a>
  </h4>
  <h5><Age :at="comment.createdAt" /> ago</h5>
  <div v-if="editing !== comment._id" class="user-content" v-html="comment.text">
  </div>
  <form v-else @submit.prevent="saveComment(comment)">
    <Editor class="editor" v-model="comment.text" />
    <div class="actions">
      <button @click="cancel">Cancel</button>
      &nbsp;
      <button type="submit">Save</button>
    </div>
  </form>
</article>
</section>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import PencilPlus from 'vue-material-design-icons/PencilPlus.vue';
import { agent } from '../lib/agent.js';
const emit = defineEmits(['change']);
const editing = ref(null);
const props = defineProps({
  ticketNumber: {
    type: number
  },
  comments: {
    type: Array
  }
});

const comments = [...props.comments];

function myComment(comment) {
  return comment._author?.[0]?._id === apos.login.user._id;
}

async function editComment(comment) {
  editing = comment._id;
}

async function deleteComment(comment) {
  await apos.http.delete(`/api/v1/comment/${comment._id}`, {
    busy: true
  });
  comments = comments.filter(c => c._id !== comment._id);
  emit('change', comments);
}

async function saveComment(comment) {
  // TODO the v-model for this is prop modification,
  // which is supposed to be Bad. Figure it out.
  // Maybe we fetch the comments on our own and they
  // are never the parent's business at all
  await apos.http.patch(`/api/v1/comment/${comment._id}`, {
    body: {
      text: comment.text
    },
    busy: true
  });
  emit('change', comments);
}
</script>
