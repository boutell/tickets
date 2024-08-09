module.exports = {
  options: {
    localized: false,
    slugPrefix: 'ticket-',
    alias: 'ticket'
  },
  extend: '@apostrophecms/piece-type',
  fields: {
    add: {
      slug: {
        type: 'slug',
        hidden: true
      },
      _organization: {
        type: 'relationship',
        withType: 'organization',
        min: 1,
        max: 1,
        required: true
      },
      _customer: {
        label: 'Customer',
        type: 'relationship',
        withType: '@apostrophecms/user',
        min: 1,
        max: 1,
        required: true
      },
      _assignee: {
        label: 'Assigned To',
        type: 'relationship',
        withType: '@apostrophecms/user',
        max: 1
      },
      _cc: {
        label: 'Cc:',
        type: 'relationship',
        withType: '@apostrophecms/user'
      },
      description: {
        label: 'Description',
        type: 'string',
        textarea: true,
        required: true
      },
      attachments: {
        type: 'array',
        inline: true,
        fields: {
          add: {
            file: {
              type: 'attachment',
              required: true,
              fileGroups: [ 'office', 'images' ]
            }
          }
        }
      },
      _comments: {
        type: 'relationshipReverse'
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: [ 'title', '_organization', '_customer', '_assignee', 'description', '_comments' ]
      },
      cc: {
        label: 'Cc:',
        fields: [ '_cc' ]
      },
      misc: {
        label: 'Misc',
        fields: [ 'slug' ]
      },
      attachments: {
        label: 'Attachments',
        fields: [ 'attachments' ]
      }
    }
  },
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
        },
        async moveComments(req, doc) {
          console.log('moving comments');
          const organizationId = doc._organization[0]._id;
          if (organizationId !== doc.organizationIdWas) {
            await self.apos.doc.db.updateMany({
              type: 'comment',
              'ticketIds.0': doc._id
            }, {
              $set: {
                organizationIds: [ organizationId ]
              }
            });
          }
          doc.organizationIdWas = doc._organization[0]._id;
          console.log(doc);
        }
      },
      afterArchive: {
        async archiveComments(req, doc) {
          const comments = await self.apos.comment.findForEditing(req, {
            'ticketIds.0': doc._id
          });
          for (const comment of comments) {
            comment.archivedWithTicket = true;
            comment.archived = true;
            await self.apos.comment.update(req, comment);
          }
          // No notification required, not too numerous
        }
      },
      afterRescue: {
        async rescueTickets(req, doc) {
          const comments = await self.apos.comment.findForEditing(req, {
            'ticketIds.0': doc._id,
            archivedWithTicket: true
          }).archived(true);
          for (const comment of comments) {
            delete comment.archivedWithTicket;
            comment.archived = false;
            await self.apos.comment.update(req, comment);
          }
          // No notification required, not too numerous
        }
      }
    };
  },
  methods(self) {
    return {
      setSlug(req, doc) {
        doc.slug = self.options.slugPrefix + self.apos.util.slugify(doc.title);
      }
    };
  }
};
