# tickets

This is a ticket management system powered by ApostropheCMS.

Zendesk import capability is included.

## TODOs

* I think I need to make separate apiRoutes for the ticket management experience. It just gets too messy otherwise. Guests will never be able to insert or update stuff. Contributors have too many hardwired rules. Advanced permission doesn't address per doc view permissions. I need to make APIs and use `permissions: false` after checking my own rules. Permissions module overrides are very complex to implement and not really an idea I want to popularize. And there are too many weird little role checks.
* Editors will be able to invite guests only via a special API, so we don't have to open up edit permissions for users
* Refactor Cc: into "Agents" and "Customer Cc:"
* Implement query builders for these
* Re-normalize them on save
* Redirect home page to login page
* Clean up styles, incl. very basic styles for info pages?
* Hide most of Apostrophe admin bar, keep "users" for admins only
* Outgoing email
* Incoming email
* Documentation
