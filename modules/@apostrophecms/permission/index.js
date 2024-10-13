// Override Apostrophe's usual permissions to suit the application

const util = require('util');

function log(o) {
  console.log(util.inspect(o, { depth: 10 }));
}

module.exports = {
  methods(self) {
    return {
      can(req, action, target) {
        const role = req.user?.role;
        if (role === 'admin') {
          return true;
        }
        const type = target && (target.type || target);
        if (!type) {
          console.log('===> weirdie:', action);
        }
        if (action === 'create') {
          if ([ 'comment', 'ticket' ].includes(type)) {
            return true;
          }
        }
        if (['view', 'view-draft'].includes(action)) {
          return true;
        }
        if (['create','edit','delete','publish'].includes(action)) {
          if (type === 'ticket') {
            if ((typeof target) === 'string') {
              // In general they can edit *some*
              return true;
            }
            return target.customerIds.includes(req.user._id) || target.organizationIds.find(id => req.user.organizationsIds.includes(id));
          }
          if (type === 'comment') {
            if ((typeof target) === 'string') {
              // In general they can edit *some*
              return true;
            }
            return (target.authorIds || []).includes(req.user._id);
          }
        }
        return false;
      },
      criteria(req, action) {
        const result = body(req, action);
        log(result);
        return result;
        function body() {
          const role = req.user?.role;
          if (role === 'admin') {
            return {};
          }
          if (action === 'view') {
            const views = [
              {
                slug: '/'
              },
              {
                type: {
                  $in: [ '@apostrophecms/image' ]
                }
              }
            ];
            if (req.user?.role === 'guest') {
              views.push({
                type: {
                  $in: [ 'ticket', 'comment' ]
                },
                organizationIds: { $in: req.user.organizationsIds }
              });
              views.push({
                type: 'organization',
                _id: { $in: req.user.organizationsIds }
              });
              views.push({
                type: '@apostrophecms/user',
                organizationsIds: { $in: req.user.organizationsIds }
              });
              views.push({
                type: '@apostrophecms/user',
                role: 'admin'
              });
            };
            return {
              $or: views
            };
          }
          if (!req.user) {
            return false;
          }
          if (['create','edit','delete','publish'].includes(action)) {
            return {
              $or: [
                {
                  type: 'ticket',
                  organizationIds: { $in: req.user.organizationsIds }
                },
                {
                  type: 'comment',
                  authorIds: { $in: [ req.user._id ] }
                }
              ]
            };
          }
          return {
            _id: '__iNeverMatch'
          };
        }
      }
    }
  }
};
