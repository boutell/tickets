module.exports = (query, idsProperty, $or) => ({
  finalize() {
    if (query.req.user?.role === 'guest') {
      const criteria = {
        $or: [
          {
            [idsProperty]: {
              $in: query.req.user.organizationsIds || [ 'iNeverMatch']
            }
          },
          ...($or || [] )
        ]
      };
      query.and(criteria);
    }
  }
});
