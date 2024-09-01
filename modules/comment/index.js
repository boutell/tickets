module.exports = {
  options: {
    localized: false,
    slugPrefix: 'comment-',
    alias: 'comment'
  },
  extend: '@apostrophecms/piece-type',
  fields: {
    remove: [ 'title' ],
    add: {
      slug: {
        type: 'slug',
        hidden: true
      },
      _author: {
        type: 'relationship',
        withType: '@apostrophecms/user',
        min: 1,
        max: 1,
        required: true
      },
      text: {
        type: 'string',
        textarea: true,
        required: true
      },
      attachments: {
        // See normalizeTextAndAttachments for why
        // this is a read-only field
        readOnly: true,
        type: 'array',
        inline: true,
        fields: {
          add: {
            attachment: {
              type: 'attachment',
              required: true,
              fileGroups: [ 'office', 'images' ]
            }
          }
        }
      },
      _ticket: {
        type: 'relationship',
        withType: 'ticket',
        min: 1,
        max: 1,
        required: true
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: [ '_ticket', 'title', '_author', 'text' ]
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
        setTitle(req, doc) {
          return self.setTitle(req, doc);
        },
        setSlug(req, doc) {
          self.setSlug(req, doc);
        },
        setOrganization(req, doc) {
          self.setOrganization(req, doc);
        }
      },
      beforeUpdate: {
        setTitle(req, doc) {
          return self.setTitle(req, doc);
        },
        setSlug(req, doc) {
          self.setSlug(req, doc);
        },
        setOrganization(req, doc) {
          self.setOrganization(req, doc);
        }
      },
      beforeSave: {
        async normalizeTextAndAttachments(req, doc) {
          await self.apos.ticket.normalizeTextAndAttachments(req, doc, 'text');
        }
      }
    }
  },
  methods(self) {
    return {
      setTitle(req, doc) {
        doc.title = doc._ticket[0].title + ': ' + ((doc.text.length > 80) ? (doc.text.substring(0, 80) + '...') : doc.text);
      },
      setSlug(req, doc) {
        doc.slug = self.options.slugPrefix + self.apos.util.slugify(doc.title);
      },
      setOrganization(req, doc) {
        doc.organizationIds = [ doc._ticket[0]._organization[0]._id ];
      }
    };
  }
};
