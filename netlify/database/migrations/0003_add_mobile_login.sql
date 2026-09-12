ALTER TABLE auth_accounts
  ADD COLUMN IF NOT EXISTS mobile_login TEXT;

UPDATE auth_accounts AS account
SET mobile_login = NULLIF(
  RIGHT(REGEXP_REPLACE(user_data.value->>'mobileNumber', '[^0-9]', '', 'g'), 10),
  ''
)
FROM app_state AS state_row
CROSS JOIN LATERAL JSONB_ARRAY_ELEMENTS(COALESCE(state_row.state->'users', '[]'::jsonb)) AS user_data(value)
WHERE state_row.id = 'default'
  AND user_data.value->>'id' = account.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_mobile_login_unique
ON auth_accounts (mobile_login)
WHERE mobile_login IS NOT NULL AND mobile_login <> '';
