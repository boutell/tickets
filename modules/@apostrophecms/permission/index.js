module.exports = {
  extendMethods(self) {
    return {
      can(_super, req, action, target) {
        const baseResult = _super(req, action, target);
        if (req.user?.role !== 'guest') {
          return baseResult;
        }
        const type = target?.type || target;
        if (action === 'create') {
          if ([ 'comment', 'ticket' ].includes(type)) {
            return true;
          }
        }
        if (action === 'edit') {
          if (type === 'ticket') {
            if ((typeof target) === 'string') {
              // In general they can edit *some*
              return true;
            }
            console.log('***', target);
            return target.customerIds.includes(req.user._id);
          }
          if (type === 'comment') {
            if ((typeof target) === 'string') {
              // In general they can edit *some*
              return true;
            }
            console.log('***', target);
            return target.authorIds.includes(req.user._id);
          }
        }
        return baseResult;
      }
    }
  }
}
