const orgRestriction = require('../../../lib/org-restriction.js');

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
  },
  queries(self, query) {
    return {
      builders: {
        usersGuests: orgRestriction(query, 'organizationsIds', [
          {
            // Guests are allowed to see all non-guests
            // (staff members) so they can interact
            // with them
            role: {
              $ne: 'guest'
            }
          }
        ])
      }
    };
  }
};
