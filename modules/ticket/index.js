const sanitizeHtml = require('sanitize-html');
const cheerio = require('cheerio');

module.exports = {
  options: {
    localized: false,
    slugPrefix: 'ticket-',
    alias: 'ticket'
  },
  extend: '@apostrophecms/piece-type',
  fields: {
    add: {
      ticketNumber: {
        type: 'integer',
        readOnly: true
      },
      subtype: {
        type: 'select',
        required: true,
        choices: [
          {
            value: 'question',
            label: 'Question'
          },
          {
            value: 'incident',
            label: 'Incident'
          },
          {
            value: 'problem',
            label: 'Problem'
          },
          {
            value: 'task',
            label: 'Task'
          }
        ]
      },
      status: {
        type: 'select',
        required: true,
        choices: [
          {
            value: 'new',
            label: 'New'
          },
          {
            value: 'pending',
            label: 'Pending'
          },
          {
            value: 'todo',
            label: 'To Do'
          },
          {
            value: 'inProgress',
            label: 'In Progress'
          },
          {
            value: 'canceled',
            label: 'Canceled'
          },
          {
            value: 'done',
            label: 'Done'
          }
        ]
      },
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
        // Read-only because it is actually managed
        // by the rich text editor (inclusion of
        // a download attribute in a link in description)
        readOnly: true,
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
        type: 'relationshipReverse',
        withRelationships: [ '_author' ]
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: [ 'title', '_organization', '_customer', 'status', '_assignee', 'description', '_comments' ]
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
  init(self) {
    self.apos.doc.db.createIndex({
      ticketNumber: 1
    }, {
      unique: true,
      sparse: true
    });
  },
  handlers(self) {
    return {
      beforeInsert: {
        async setNumber(req, doc) {
          if (doc.ticketNumber) {
            // Import, for instance
            return;
          }
          // MongoDB doesn't provide consecutive ids, but
          // they are widely preferred for tickets.
          // Use a lock to prevent race conditions
          await self.apos.lock.withLock('ticket-number', async () => {
            // Use the published global doc of the default locale
            // as a single shared source of truth for the next
            // ticket id
            const criteria = {
              type: '@apostrophecms/global',
              aposLocale: `${self.apos.i18n.defaultLocale}:published`
            };
            const lastNumber = (await self.apos.doc.db.findOne(criteria))?.lastTicketNumber || 0;
            const nextNumber = lastNumber + 1;
            doc.ticketNumber = nextNumber;
            await self.apos.doc.db.updateOne(
              criteria,
              {
                $set: {
                  lastTicketNumber: nextNumber
                }
              }
            );
          });
        },
        setSlug(req, doc) {
          self.setSlug(req, doc);
        }
      },
      beforeUpdate: {
        setSlug(req, doc) {
          self.setSlug(req, doc);
        },
        async moveComments(req, doc) {
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
        }
      },
      beforeSave: {
        async normalizeDescriptionAndAttachments(req, doc) {
          await self.normalizeTextAndAttachments(req, doc, 'description');
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
      },
      async normalizeTextAndAttachments(req, doc, field) {
        doc[field] = sanitizeHtml(doc[field], {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'figure', 'img' ]),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            a: [ 'href', 'download' ]
          }
        });
        const $ = cheerio.load(doc[field]);
        const $links = $('a[download]');
        const ids = [];
        $links.each((i, e) => {
          const $link = $(e);
          console.log($link);
          console.log(`>${$link.prop('outerHTML')}`);
          const href = $link.attr('href');
          const matches = href.match(/^\/uploads\/attachments\/(\w+)[^?#]+$/);
          if (!matches) {
            $link.remove();
            return;
          }
          ids.push(matches[1]);
        });
        const attachments = await self.apos.attachment.db.find({
          _id: { $in: ids }
        }).toArray();
        doc.attachments = attachments;
        doc[field] = $.html();
      }
    };
  }
};
