const fs = require('fs');
const { globSync } = require('glob');

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
                const extension = extensions[attachment.content_type] || 'unknown';
                if (extension === 'unknown') {
                  console.error(`Unknown extension for: ${attachment.content_type}`);
                }
                const name = `${attachmentsDir}/${attachment.id}.${extension}`;
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
          if (!fs.existsSync(data)) {
            throw new Error('Run the zendesk:download task first.');
          }

          // const userJsonFiles = globSync(`${data}/users/*.json`);
          // for (const userJsonFile of userJsonFiles) {
          //   const info = JSON.parse(fs.readFileSync(userJsonFile));
          //   const user = self.apos.user.newInstance();
          //   user.title = info.name;
          //   user.email = info.email;
          //   user.username = info.email;
          //   user._organizations = [
          //     {
          //       _id: `org${info.organization_id}`
          //     }
          //   ];
          //   user.role = {
          //     'admin': 'admin',
          //     'agent': 'editor',
          //     'end-user': 'guest'
          //   }[info.role];
          //   user.createdAt = new Date(info.created_at);
          //   user.updatedAt = new Date(info.updated_at);
          //   user.notes = info.notes;
          //   user.legacy = info;
          //   user._id = `user${info.id}`;
          //   console.log(`inserting ${user._id}`);
          //   await self.apos.user.insert(req, user);
          // }

          // const orgJsonFiles = globSync(`${data}/organizations/*.json`);
          // for (const orgJsonFile of orgJsonFiles) {
          //   const info = JSON.parse(fs.readFileSync(orgJsonFile));
          //   const org = self.apos.organization.newInstance();
          //   org.title = info.name;
          //   org.notes = info.notes;
          //   org.legacy = info;
          //   org.createdAt = new Date(info.created_at);
          //   org.updatedAt = new Date(info.updated_at);
          //   org.domains = info.domain_names.map(name => ({ name }));
          //   org._id = `org${info.id}`;
          //   console.log(`inserting ${org._id}`);
          //   await self.apos.organization.insert(req, org);
          // }

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
            ticket._id = `ticket${info.id}`;
            const legacyTicketId = info.id;
            console.log(`inserting ${ticket._id}`);
            ticket = await self.apos.ticket.insert(req, ticket);

            const commentJsonFiles = globSync(`${data}/tickets/${info.id}/comments/*.json`);
            for (commentJsonFile of commentJsonFiles) {
              const info = JSON.parse(fs.readFileSync(commentJsonFile));
              const comment = self.apos.comment.newInstance();
              comment.text = info.body;
              comment._ticket = [ ticket ];
              comment._author = [
                {
                  _id: `user${info.author_id}`
                }
              ];
              comment.legacy = info;
              comment.createdAt = new Date(info.created_at);
              comment.updatedAt = new Date(info.updated_at);
              comment._id = `comment${info.id}`;

              const attachmentFiles = globSync(`${data}/tickets/${legacyTicketId}/comments/${info.id}/attachments/*`);
              const attachments = [];
              for (const attachmentFile of attachmentFiles) {
                const attachment = self.apos.attachment.insert(req, {
                  path: attachmentFile,
                  name: attachmentFile
                });
                attachments.push(attachment);
              }
              comment.attachments = attachments.map(attachment => ({
                attachment
              }));

              console.log(`inserting ${comment._id}`);
              console.log(JSON.stringify(comment, null, '  '));
              await self.apos.comment.insert(req, comment);
            }
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
