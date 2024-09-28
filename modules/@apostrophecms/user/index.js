const orgRestriction = require('../../../lib/org-restriction.js');

module.exports = {
  options: {
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
  },
  queries(self, query) {
    return {
      builders: {
        ticketsGuests: orgRestriction(query)
      }
    };
  }
};
