const fs = require('fs');

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
            await iterate(`tickets/${ticket.id}/comments`, 'comments', async comment => {
              const attachmentsDir = `${commentsDir}/${comment.id}/attachments`;
              ensure(attachmentsDir);
              for (attachment of comment.attachments) {
                const extension = extensions[attachment.content_type] || 'unknown';
                if (extension === 'unknown') {
                  console.error(`Unknown extension for: ${attachment.content_type}`);
                }
                const name = `${attachmentsDir}/${attachment.id}.${extension}`;
                fs.writeFileSync(name, await self.apos.http.get(attachment.content_url));
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
  "video/quicktime": ".mov",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx"
};
