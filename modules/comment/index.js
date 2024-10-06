const orgRestriction = require('../../lib/org-restriction.js');

const sanitizeHtml = require('sanitize-html');
const cheerio = require('cheerio');

module.exports = {
  options: {
    guestApiAccess: true,
    localized: false,
    slugPrefix: 'comment-',
    alias: 'comment',
    viewRole: 'guest',
    editRole: 'guest',
    publishRole: 'guest'
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
        setTitleAndSlug(req, doc) {
          self.setTitle(req, doc);
          self.setSlug(req, doc);
        },
        setAuthor(req, doc) {
          // Backstop so you can't fake a comment
          // as anyone else. But: Do not do this in the
          // command line import task
          if (req.user?._id) {
            doc._author = [ req.user ];
          }
        }
      },
      beforeUpdate: {
        setTitle(req, doc) {
          return self.setTitle(req, doc);
        },
        setSlug(req, doc) {
          self.setSlug(req, doc);
        }
      },
      beforeSave: {
        async normalizeTextAndAttachments(req, doc) {
          await self.normalizeTextAndAttachments(req, doc);
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
      async normalizeTextAndAttachments(req, doc) {
        doc.text = sanitizeHtml(doc.text, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'figure', 'img' ]),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            a: [ 'href', 'download' ]
          }
        });
        const $ = cheerio.load(doc.text);
        const $links = $('a[download]');
        const ids = [];
        $links.each((i, e) => {
          const $link = $(e);
          const href = $link.attr('href');
          const matches = href.match(/^\/uploads\/attachments\/(\w+)[^?#]+$/);
          if (!matches) {
            $link.remove();
            return;
          }
          ids.push(matches[1]);
        });
        // For import. Why do you do this Zendesk? Why?
        const $nestedCode = $('pre>code');
        $nestedCode.each((i, e) => {
          const $code = $(e);
          const text = $code.text();
          const $pre = $nestedCode.parent();
          $pre.text(text);
        });
        const attachments = await self.apos.attachment.db.find({
          _id: { $in: ids }
        }).toArray();
        doc.attachments = attachments;
        doc.text = $.html();
      }
    };
  },
  queries(self, query) {
    return {
      builders: {
        commentsGuests: orgRestriction(query, 'organizationIds')
      }
    };
  }
};
