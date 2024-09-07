<template>
<section class="comments">
  <h2>Comments</h2>
  <div class="actions">
    <button v-if="!newComment" @click="newComment = true"><PencilPlus /> New Comment</button>
  </div>
  <EditComment v-if="newComment" @cancel="cancelEditComment(comment)" @save="insertComment" />
  <article v-for="comment in comments">
    <h4>
      {{ comment._author?.[0]?.title || 'unknown' }}
      <a v-if="myComment(comment) && (!editing)" @click.prevent="editComment(comment)"><Pencil /> Edit</a>
      <a v-if="agent || myComment(comment)" @click.prevent="deleteComment(comment)">x Delete</a>
    </h4>
    <h5><Age :at="comment.createdAt" /> ago</h5>
    <div v-if="editing !== comment._id" class="user-content" v-html="comment.text">
    </div>
    <EditComment v-else :comment="comment" @cancel="cancelEditComment(comment)" @save="saveComment" />
  </article>
</section>
</template>

<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import PencilPlus from 'vue-material-design-icons/PencilPlus.vue';
import Pencil from 'vue-material-design-icons/Pencil.vue';
import { agent } from '../lib/agent.js';
import Age from './Age.vue';

const emit = defineEmits(['change']);
const editing = ref(null);
const newComment = ref(false);
const props = defineProps({
  ticketNumber: {
    type: Number
  },
  ticketId: {
    type: String
  },
  comments: {
    type: Array
  }
});

// Once mounted, we own the comments. We're not worried
// about a new array being pushed down by the parent.
//
// But just to be polite, we make a shallow clone and never
// modify the individual objects in it, so we are not engaging
// in the dreaded prop modification.
const comments = ref([...props.comments]);

function myComment(comment) {
  return comment._author?.[0]?._id === apos.login.user._id;
}

async function insertComment(comment) {
  comment = await apos.http.post('/api/v1/comment', {
    body: {
      text: comment.text,
      // Satisfies the POST route requirements,
      // but author = self will also be enforced
      // server side
      _author: [
        apos.login.user
      ],
      _ticket: [
        {
          _id: props.ticketId
        }
      ]
    },
    busy: true
  });
  comments.value = [
    comment,
    ...comments.value
  ];
  newComment.value = false;
}

async function editComment(comment) {
  editing.value = comment._id;
}

async function deleteComment(comment) {
  await apos.http.delete(`/api/v1/comment/${comment._id}`, {
    busy: true
  });
  comments.value = comments.value.filter(c => c._id !== comment._id);
}

async function saveComment(comment) {
  editing.value = null;
  comment = await apos.http.patch(`/api/v1/comment/${comment._id}`, {
    body: {
      text: comment.text,
      // Satisfies the POST route requirements,
      // but author = self will also be enforced
      // server side
      _author: [
        apos.login.user
      ]
    },
    busy: true
  });
  // Replace in the array
  const index = comments.value.findIndex(({ _id }) => _id === comment._id);
  comments.value = [
    ...comments.value.slice(0, index),
    comment,
    ...comments.value.slice(index + 1)
  ];
}

function cancelEditComment(comment) {
  newComment.value = false;
  editing.value = null;
}
</script>
