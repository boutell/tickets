module.exports = {
  fields: {
    add: {
      _organizations: {
        type: 'relationship',
        withType: 'organization',
        label: 'Organizations'
      }
    }
  }
};
