module.exports = {
  options: {
    fileGroups: [
      {
        name: 'images',
        label: 'apostrophe:images',
        extensions: [
          'gif',
          'jpg',
          'png',
          'svg',
          'webp'
        ],
        extensionMaps: { jpeg: 'jpg' },
        // uploadfs should treat this as an image and create scaled versions
        image: true
      },
      {
        name: 'office',
        label: 'apostrophe:office',
        extensions: [
          'txt',
          'rtf',
          'pdf',
          'xls',
          'ppt',
          'doc',
          'pptx',
          'sldx',
          'ppsx',
          'potx',
          'xlsx',
          'xltx',
          'csv',
          'docx',
          'dotx',
          'js',
          'json',
          'mp4',
          'mov',
          'zip',
          'gz',
          'tar'
        ],
        extensionMaps: {},
        // uploadfs should just accept this file as-is
        image: false
      }
    ]
  }
};
