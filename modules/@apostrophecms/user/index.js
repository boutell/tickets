module.exports = {
  options: {
    guestApiAccess: true,
    viewRole: 'guest'
  },
  fields: {
    add: {
      _organizations: {
        type: 'relationship',
        withType: 'organization',
        label: 'Organizations'
      },
      notes: {
        type: 'string',
        textarea: true
      }
    }
  }
};
