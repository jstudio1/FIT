# Security and privacy operations

## Required production secrets

- `AUTH_SECRET`: random value of at least 32 characters. Generate with a cryptographically secure password manager.
- `AUDIT_PEPPER`: separate random value used to HMAC IP addresses in security logs.
- `AUTH_SECRET_PREVIOUS`: optional old signing secret during a rotation window. Remove it after the maximum session lifetime.
- Use database/storage encryption at rest and TLS for database connections. Do not store database backups unencrypted.

## Secret rotation

1. Move the current `AUTH_SECRET` to `AUTH_SECRET_PREVIOUS`.
2. Deploy a new random `AUTH_SECRET`.
3. After seven days, remove `AUTH_SECRET_PREVIOUS`.
4. For emergency revocation, increment `users.session_version` for affected users or all users.

## Retention and privacy requests

- Login attempts: delete after 90 days.
- Audit logs: retain 1 year, then archive/delete according to legal requirements.
- Completed export requests: retain metadata for 90 days.
- Account deletion requests: review and complete within 30 days. Delete uploaded files, anonymize records that must be retained, and delete the remaining account data in a transaction.
- Do not hard-delete a user before confirming financial/legal retention requirements.

## Backup and disaster recovery

- Run encrypted daily database backups and encrypted object/file backups.
- Keep 7 daily, 4 weekly, and 12 monthly recovery points in a separate account/location.
- Test a restore into an isolated environment at least quarterly; record restore time and data-loss window.
- Back up and restore the `uploads` directory together with its matching database snapshot.
