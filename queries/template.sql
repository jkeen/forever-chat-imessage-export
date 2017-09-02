SELECT
  m.rowid as msg_id,

  NULL as message_group,

  CASE NULL
      WHEN 0 THEN "???"
      WHEN 1 THEN "Individual"
      ELSE "Group"
  END AS chat_type,

  date,

  NULL AS address,

  NULL as account_login,

  NULL AS participants, // single string of numbers, "|*--*|" for group separator

  is_from_me,

  strftime("%Y-%m-%dT%H:%M:%S", DATETIME(date +978307200, "unixepoch")) AS formatted_date,

  NULL as me,

  NULL as type,

  NULL as text,

  NULL AS formatted_date_read,

  NULL AS formatted_date_delivered,

  NULL AS attachment,
  NULL AS attachment_mime_type,

  NULL as service

FROM message AS m
ORDER BY date
