module.exports = query => ({
  finalize() {
    if (query.req.user?.role === 'guest') {
      query.and({
        $or: [
          {
            organizationIds: {
              $in: req.user.organizationsIds || []
            }
          },
          {
            role: {
              $ne: 'guest'
            }
          }
        ]
      });
    }
  }
});
