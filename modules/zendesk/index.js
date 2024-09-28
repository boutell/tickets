const fs = require('fs');
const { globSync } = require('glob');
const { extname, basename } = require('path');

module.exports = {
  tasks(self) {
    return {
      download: {
        async task(argv) {
          let start = Date.now();
          let calls = 0;
          // Default to max 190 requests per minute: a little below the official limit for the support plan
          let rateLimit = argv['rate-limit'] ? parseInt(argv['rate-limit']) : 190;
          const data = `${__dirname}/../../data/zendesk`;
          ensure(data);
          const token = argv['zendesk-token'];
          if (!token) {
            throw new Error('--zendesk-token is required');
          }
          const username = argv['zendesk-username'];
          if (!username) {
            throw new Error('--zendesk-username is required');
          }
          const subdomain = argv['zendesk-subdomain'];
          if (!subdomain) {
            throw new Error('--zendesk-subdomain is required');
          }

          const authorization = `Basic ${Buffer.from(`${username}/token:${token}`).toString('base64')}`;

          const orgsDir = `${data}/organizations`;
          ensure(orgsDir);
          await iterate('organizations', 'organizations', async organization => {
            write(`${orgsDir}/${organization.id}.json`, organization);
          });

          const usersDir = `${data}/users`;
          ensure(usersDir);
          await iterate('users', 'users', async user => {
            write(`${usersDir}/${user.id}.json`, user);
          });

          const ticketsDir = `${data}/tickets`;
          ensure(ticketsDir);
          await iterate('tickets', 'tickets', async ticket => {
            const ticketDir = `${ticketsDir}/${ticket.id}`;
            ensure(ticketDir);
            write(`${ticketDir}/ticket.json`, ticket);
            const commentsDir = `${ticketDir}/comments`;
            ensure(commentsDir);
            await iterate(`tickets/${ticket.id}/comments?include_inline_images=true`, 'comments', async comment => {
              const attachmentsDir = `${commentsDir}/${comment.id}/attachments`;
              ensure(attachmentsDir);
              for (attachment of comment.attachments) {
                const fullName = attachment.file_name;
                let ext = extname(fullName);
                if (ext) {
                  ext = ext.toLowerCase();
                }
                const base = basename(fullName, ext);
                const fileName = self.apos.util.slugify(base) + ext;
                const name = `${attachmentsDir}/${attachment.id}.${fileName}`;
                if (!fs.existsSync(name)) {
                  const response = await fetch(attachment.content_url);
                  fs.writeFileSync(name, Buffer.from(await response.arrayBuffer()));
                }
              }
              write(`${commentsDir}/${comment.id}.json`, comment);
            });
          });

          async function iterate(path, noun, fn) {
            let nextPage = `https://${subdomain}.zendesk.com/api/v2/${path}`;
            while (nextPage) {
              const response = await get(nextPage);
              for (const item of response[noun]) {
                await fn(item);
              }
              nextPage = response.next_page;
            }
          }

          async function get(url) {
            if (argv.verbose) {
              console.error(`Fetching ${url}`);
            }
            const now = Date.now();
            const elapsedMinutes = (now - start) / 1000 / 60;
            const allowedMinutes = calls / rateLimit;
            if (argv.verbose) {
              console.error(`Elapsed minutes: ${elapsedMinutes} Allowed minutes: ${allowedMinutes}`);
            }
            if (elapsedMinutes < allowedMinutes) {
              await pause(allowedMinutes - elapsedMinutes);
            }
            const result = await self.apos.http.get(url, {
              headers: {
                authorization
              }
            });
            calls++;
            return result;
          }

          function pause(minutes) {
            const ms = minutes * 60 * 1000;
            if (argv.verbose) {
              console.error(`Pausing for ${minutes} minutes (${ms}ms) to honor rate limit`);
            }
            return new Promise(resolve => setTimeout(ms, resolve));
          }
        },
        help: 'Download Zendesdk to local JSON in data/zendesk'
      },
      import: {
        async task(argv) {
          const data = `${__dirname}/../../data/zendesk`;
          const req = self.apos.task.getReq();
          let lastTicketNumber = 0;
          if (!fs.existsSync(data)) {
            throw new Error('Run the zendesk:download task first.');
          }

          if (!argv['skip-orgs']) {
            const orgJsonFiles = globSync(`${data}/organizations/*.json`);
            for (const orgJsonFile of orgJsonFiles) {
              const info = JSON.parse(fs.readFileSync(orgJsonFile));
              const org = self.apos.organization.newInstance();
              org.title = info.name;
              org.notes = info.notes;
              org.legacy = info;
              org.domains = info.domain_names.map(name => ({ name }));
              setIds(org, 'org', info);
              await self.apos.organization.insert(req, org);
              await fixTimes(org, info);
            }
          }

          if (!argv['skip-users']) {
            const userJsonFiles = globSync(`${data}/users/*.json`);
            for (const userJsonFile of userJsonFiles) {
              const info = JSON.parse(fs.readFileSync(userJsonFile));
              const user = self.apos.user.newInstance();
              user.title = info.name;
              user.email = info.email;
              user.username = info.email;
              user._organizations = [
                {
                  _id: `org${info.organization_id}`
                }
              ];
              user.role = {
                'admin': 'admin',
                'agent': 'editor',
                'end-user': 'guest'
              }[info.role];
              user.notes = info.notes;
              user.legacy = info;
              setIds(user, 'user', info);
              await self.apos.user.insert(req, user);
              await fixTimes(user, info);
            }
          }

          const ticketJsonFiles = globSync(`${data}/tickets/*/ticket.json`);
          for (const ticketJsonFile of ticketJsonFiles) {
            const info = JSON.parse(fs.readFileSync(ticketJsonFile));
            let ticket = self.apos.ticket.newInstance();
            ticket.title = info.subject;
            ticket.description = info.description;
            ticket._customer = [
              {
                _id: `user${info.requester_id}`
              }
            ];
            ticket._assignee = [
              {
                _id: `user${info.assignee_id}`
              }
            ];
            ticket._organization = [
              {
                _id: `org${info.organization_id}`
              }
            ];
            ticket._cc = [...(new Set([...info.email_cc_ids, ...info.follower_ids, ...info.collaborator_ids]))].map(id => ({
              _id: `user${id}`
            }));
            ticket.legacy = info;
            ticket.createdAt = new Date(info.created_at);
            ticket.updatedAt = new Date(info.updated_at);
            ticket.ticketNumber = info.id;
            const legacyTicketId = info.id;
            lastTicketNumber = Math.max(lastTicketNumber, ticket.ticketNumber);
            setIds(ticket, 'ticket', info);
            ticket = await self.apos.ticket.insert(req, ticket);
            await fixTimes(ticket, info);

            const commentJsonFiles = globSync(`${data}/tickets/${info.id}/comments/*.json`);
            for (commentJsonFile of commentJsonFiles) {
              const info = JSON.parse(fs.readFileSync(commentJsonFile));
              const comment = self.apos.comment.newInstance();
              comment.text = info.html_body;
              comment._ticket = [ ticket ];
              comment._author = [
                {
                  _id: `user${info.author_id}`
                }
              ];
              comment.legacy = info;
              comment.createdAt = new Date(info.created_at);
              comment.updatedAt = new Date(info.updated_at);
              setIds(comment, 'comment', info);

              const attachmentFiles = globSync(`${data}/tickets/${legacyTicketId}/comments/${info.id}/attachments/*`);
              let attachments = [];
              for (const attachmentFile of attachmentFiles) {
                try {
                  const attachment = await self.apos.attachment.insert(req, {
                    path: attachmentFile,
                    name: attachmentFile
                  });
                  const name = attachment.name;
                  attachments.push(attachment);
                } catch (e) {
                  console.error(`Attachment skipped: ${attachmentFile}`);
                }
              }
              comment.text = comment.text.replace(/<img src="([^"]+)"[^>]+>/g, (all, url) => {
                const q = url.indexOf('?name=');
                if (q === -1) {
                  return all;
                }
                const fullName = decodeURIComponent(url.substring(q + '?name='.length));
                const ext = extname(fullName);
                const base = basename(fullName, ext);
                const name = self.apos.util.slugify(base);
                const attachment = attachments.find(attachment => {
                  return attachment.name.endsWith(`-${name}`);
                });
                if (attachment) {
                  attachments = attachments.filter(a => attachment !== a);
                  return attachmentMarkup(attachment);
                }
                return all;
              });
              comment.text += '<!-- end of regular text -->\n';
              for (const attachment of attachments) {
                comment.text += attachmentMarkup(attachment) + '\n';
              }
              await self.apos.comment.insert(req, comment);
              await fixTimes(comment, info);
            }
          }

          const criteria = {
            type: '@apostrophecms/global',
            aposLocale: `${self.apos.i18n.defaultLocale}:published`
          };
          await self.apos.doc.db.updateOne(
            criteria,
            {
              $set: {
                lastTicketNumber
              }
            }
          );

          function setIds(piece, prefix, info) {
            piece._id = `${prefix}${info.id}`;
            piece.aposDocId = piece._id;
          }

          async function fixTimes(piece, info) {
            piece.createdAt = new Date(info.created_at);
            piece.updatedAt = new Date(info.updated_at);
            await self.apos.doc.db.updateOne({
              _id: piece._id
            }, {
              $set: {
                createdAt: piece.createdAt,
                updatedAt: piece.updatedAt
              }
            });
          }

          function e(s) {
            return self.apos.util.escapeHtml(s);
          }

          function attachmentMarkup(attachment) {
            const src = self.apos.attachment.url(attachment, { size: 'full' });
            const name = attachment.name;
            const extension = attachment.extension;
            const img = [ 'jpg', 'png', 'gif', 'webp', 'svg' ].includes(extension) ?
              `<img src="${e(src)}" alt="${e(name)}" />` : '';
            return `<figure>${img}<figcaption><a href="${e(src)}" download>Download ${e(name)}</a></figcaption></figure>`;
          }

        },
        help: 'Imports data previously obtained from Zendesk using the download task'
      }
    }
  }
};

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, object) {
  fs.writeFileSync(file, JSON.stringify(object, null, '  '));
}

const extensions = {
  "text/plain": "txt",
  "message/rfc822": "txt",
  "text/csv": "csv",
  "text/html": "html",
  "text/css": "css",
  "text/javascript": "js",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/json": "json",
  "application/xml": "xml",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/gzip": "gz",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "application/octet-stream": "bin",
  "application/x-tar": ".tar",
  "application/gzip": ".gz",
  "application/x-bzip2": ".bz2",
  "application/x-xz": ".xz",
  "application/x-7z-compressed": ".7z",
  "application/x-compressed-tar": ".tar.gz",
  "application/x-bzip-compressed-tar": ".tar.bz2",
  "application/x-xz-compressed-tar": ".tar.xz",
  "video/quicktime": "mov",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx"
};
