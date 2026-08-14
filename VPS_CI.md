# ChoreChamps VPS CI

ChoreChamps CI runs on the production VPS. GitHub Actions is not part of the
release path.

The CI gate runs from `/root/chore-champs` and checks locked dependencies,
Prisma client generation, TypeScript, ESLint, unit tests, store assets, and the
production build.

Run it before a deploy:

```bash
ssh hostinger
cd /root/chore-champs
systemctl start --wait chore-champs-ci.service
```

The deploy script runs the same gate automatically after pulling `master` and
before building the Docker image. Use `--skip-ci` only for a reviewed rollback
or an explicitly approved emergency operation.

CI output is available in the terminal and in the system journal:

```bash
journalctl -u chore-champs-ci.service --since today
```
