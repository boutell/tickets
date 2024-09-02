db.aposDocs.deleteMany({ type: 'ticket' });
db.aposDocs.deleteMany({ type: 'comment' });
db.aposAttachments.remove({});
