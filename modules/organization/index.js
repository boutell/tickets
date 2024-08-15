module.exports = {
  options: {
    localized: false,
    slugPrefix: 'organization-',
    alias: 'organization'
  },
  extend: '@apostrophecms/piece-type',
  fields: {
    add: {
      slug: {
        type: 'slug',
        hidden: true
      },
      domains: {
        type: 'array',
        inline: true,
        style: 'table',
        label: 'Email Domains',
        fields: {
          add: {
            name: {
              type: 'string',
              required: true,
              label: 'Domain'
            }
          }
        }
      },
      notes: {
        type: 'string',
        textarea: true
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: [ 'title', 'domain', 'notes' ]
      }
    }
  },
  handlers(self) {
    return {
      handlers(self) {
        return {
          beforeInsert: {
            setSlug(req, doc) {
              self.setSlug(req, doc);
            }
          },
          beforeUpdate: {
            setSlug(req, doc) {
              self.setSlug(req, doc);
            }
          },
          afterArchive: {
            async archiveTickets(req, doc) {
              const tickets = await self.apos.ticket.findForEditing(req, {
                organizationIds: {
                  $in: [ doc._id ]
                }
              });
              self.apos.notify(req, 'Archiving related tickets and comments...', {
                dismiss: true
              });
              for (const ticket of tickets) {
                ticket.archivedWithOrganization = true;
                ticket.archived = true;
                await self.apos.ticket.update(req, ticket);
              }
              self.apos.notify(req, 'Finished archiving related tickets and comments', {
                dismiss: true
              });
            }
          },
          afterRescue: {
            async rescueTickets(req, doc) {
              const tickets = await self.apos.ticket.findForEditing(req, {
                organizationIds: {
                  $in: [ doc._id ]
                },
                archivedwithOrganization: true
              }).archived(true);
              self.apos.notify(req, 'Rescuing related tickets and comments...', {
                dismiss: true
              });
              for (const ticket of tickets) {
                delete ticket.archivedWithOrganization;
                ticket.archived = false;
                await self.apos.ticket.update(req, ticket);
              }
              self.apos.notify(req, 'Finished rescuing related tickets and comments', {
                dismiss: true
              });
            }
          }
        }
      }
    }
  },
  methods(self) {
    return {
      setSlug(req, doc) {
        doc.slug = self.options.slugPrefix + self.apos.util.slugify(doc.title);
      }
    };
  }
};
