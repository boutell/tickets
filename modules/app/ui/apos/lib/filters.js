import { ref, onMounted } from 'vue';

const filters = [
  {
    name: '_organization',
    choices: ref([]),
    label: 'Organization',
    edit: true,
    relationship: true
  },
  {
    name: '_customer',
    choices: ref([]),
    label: 'Customer',
    dependencies: {
      // The key is a filter that must be set before
      // this filter, "_customer", can be populated.
      //
      // The value is the relationship name to be used
      // to narrow the results for this filter, "_customer".
      //
      // e.g. "_organization" is a field that relates
      // tickets to organizations, and customers
      // (users) have an "_organizations" field that relates
      // them to organizations.
      '_organization': '_organizations'
    },
    edit: true,
    relationship: true
  },
  {
    name: '_cc',
    choices: ref([]),
    multiple: true,
    label: 'Cc:',
    dependencies: {
      '_organization': 'organizationsOrAgent'
    },
    edit: true,
    relationship: true
  },
  {
    name: '_assignee',
    choices: ref([]),
    label: 'Assignee',
    edit: true,
    qs: {
      role: [ 'admin', 'editor' ]
    },
    agent: true,
    relationship: true
  },
  {
    name: 'status',
    edit: true,
    choices: ref([]),
    label: 'Status'
  },
  {
    name: 'page'
  },
  {
    name: 'q'
  }
];

export default filters;
