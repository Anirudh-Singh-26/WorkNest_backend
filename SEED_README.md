# Demo Seed

Run from `backend/`:

```bash
npm run seed
```

The seed resets the current database collections used by Fixl and creates demo data.

Demo password:

```text
Demo@123
```

Users:

```text
owner@fixl.demo
admin@fixl.demo
manager@fixl.demo
member@fixl.demo
viewer@fixl.demo
```

The seed includes workspace membership, project membership, tasks with different statuses/priorities, dependencies, comments, notifications, saved filters, activity logs and attachment metadata.

Do not run the seed against a production database.
