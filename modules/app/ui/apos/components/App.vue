<script setup>
import { ref, watch, onMounted } from 'vue';
import { RouterView } from 'vue-router';
import Nav from './Nav.vue';
</script>

<template>
  <h1>Welcome to Support!</h1>
  <Nav />
  <RouterView />
</template>
