module.exports = {
  extendMethods(self) {
    return {
      can(_super, req, action, target) {
        if (req.user?.role !== 'guest') {
          return _super(req, action, target);
        }
        if (_super(req, action, target)) {
          return true;
        }
        if (type === '@apostrophecms/user') {
          if (action !== 'view') {
            return false;
          }
          // Target is another user, so it has _organizations
          return (req.user._organizationsIds || []).find(id => (target._organizationsIds || []).includes(id));
        }
        if ([ 'ticket', 'comment' ].includes(type)) {
          // Target is a ticket or comment, so it has singular _organization
          return (req.user._organizationsIds || []).find(id => (target._organizationIds || []).includes(id));
        }
        return false;
      },
      criteria(_super, req, action, target) {
        if (req.user?.role !== 'guest') {
          return _super(req, action, target);
        }
        const type = target.type || target;
        if (type === '@apostrophecms/user') {
          if (action !== 'view') {
            return _super(req, action, target);
          }
          const adminReq = self.apos.task.getReq();
          const c = _super(adminReq, action, target);
          return {
            $and: [
              c,
              {
                $or: [
                  {
                    organizationsIds: {
                      $in: req.user
                    }
                  },
                  {
                    role: {
                      $ne: 'guest'
                    }
                  }
                ]
              }
            ]
          };
        }
        if ([ 'ticket', 'comment' ].includes(type)) {
          const adminReq = self.apos.task.getReq();
          const c = _super(adminReq, action, target);
          return {
            $and: [
              c,
              {
                organizationIds: {
                  $in: req.user.organizationsIds
                }
              }
            ]
          };
        }
        return _super(req, action, target);
      }
    }
  }
}
