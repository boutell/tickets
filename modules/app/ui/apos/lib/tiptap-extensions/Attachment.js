import {
  mergeAttributes,
  Node
} from '@tiptap/core';

console.log('*** initializing');

export default options => {
  return Node.create({
    name: 'attachment',

    addOptions() {
      return {
        addPasteHandler: true,
        HTMLAttributes: {}
      };
    },

    allowGapCursor: true,
    atom: true,
    selectable: true,

    group: 'block',
    content: 'inline*',
    draggable: true,
    isolating: true,

    addAttributes() {
      return {
        url: {
          default: null,
          parseHTML(element) {
            console.log('calling attachmentId');
            return getAttachmentUrl(element);
          }
        }
      };
    },

    parseHTML() {
      return [
        {
          tag: 'figure'
        }
      ];
    },

    renderHTML({ HTMLAttributes }) {
      const { url, name, extension } = parseAttachmentUrl(HTMLAttributes.url);

      const img = [ 'jpg', 'png', 'gif', 'webp', 'svg' ].includes(extension) ? [
        [
          'img',
          {
            src: url,
            alt: name,
            draggable: false,
            contenteditable: false
          }
        ]
      ] : [];
      const result = [
        'figure',
        ...img,
        [
          'figcaption',
          [
            'a',
            {
              href: url,
              download: `${name}.${extension}`
            },
            `Download ${name}.${extension}`
          ]
        ]
      ];
      return result;
    },

    addCommands() {
      return {
        setAttachment: (attrs) => ({ chain }) => {
          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs
            })
            .createParagraphNear()
            .run();
        }
      };
    }
  });
};

function getAttachmentUrl(element) {
  return element.querySelector('a[download]')?.getAttribute('href');
}

function parseAttachmentUrl(url) {
  const matches = url?.match(/\/attachments\/([a-z0-9]+)-(.*)?\.(\w+)$/);
  if (!matches) {
    return false;
  }
  const result = {
    url,
    attachmentId: matches[1],
    name: matches[2],
    extension: matches[3]
  };
  console.log('===>', result);
  return result;
}
