SELECT
  m.rowid as message_id,

  (SELECT chat_id FROM chat_message_join WHERE chat_message_join.message_id = m.rowid) as message_group,

  CASE p.participant_count
      WHEN 0 THEN "???"
      WHEN 1 THEN "Individual"
      ELSE "Group"
  END AS chat_type,

  date,

  id AS address,

  (SELECT c.account_login FROM chat as c WHERE c.rowid = (SELECT chat_id FROM chat_message_join WHERE chat_message_join.message_id = m.rowid)) as account_login,

  (SELECT GROUP_CONCAT(id, "|*--*|") FROM handle as h2
    INNER JOIN chat_message_join AS cmj2 ON h2.rowid = chj2.handle_id
    INNER JOIN chat_handle_join AS chj2 ON cmj2.chat_id = chj2.chat_id
    WHERE cmj2.message_id = m.rowid) AS participants,

  is_from_me,

  strftime("%Y-%m-%dT%H:%M:%S", DATETIME(date +978307200, "unixepoch")) AS formatted_date,

  CASE is_from_me
    WHEN 1 THEN
      coalesce(coalesce(last_addressed_handle, account_login), id)
    ELSE
      coalesce(last_addressed_handle, account_login)
  END AS me,

  CASE is_from_me
      WHEN 0 THEN "Received"
      WHEN 1 THEN "Sent"
      ELSE is_from_me
  END AS type,

  text,

  CASE date_read
    WHEN 0 THEN null
    ELSE strftime("%Y-%m-%dT%H:%M:%S", DATETIME(date_read +978307200, "unixepoch"))
  END AS formatted_date_read,

  CASE date_delivered
    WHEN 0 THEN null
    ELSE strftime("%Y-%m-%dT%H:%M:%S", DATETIME(date_delivered +978307200, "unixepoch"))
  END AS formatted_date_delivered,


  CASE cache_has_attachments
      WHEN 0 THEN Null
      WHEN 1 THEN filename
  END AS attachment,

  m.service

FROM message AS m
LEFT JOIN message_attachment_join AS maj ON maj.message_id = m.rowid
LEFT JOIN attachment AS a ON a.rowid = maj.attachment_id
LEFT JOIN handle AS h ON h.rowid = m.handle_id
LEFT JOIN chat_message_join as chj ON chj.message_id = m.rowid
LEFT JOIN chat as ch ON chj.chat_id = ch.ROWID
LEFT JOIN (SELECT count(*) as participant_count, cmj.chat_id, cmj.message_id as mid FROM
    chat_handle_join as chj
    INNER JOIN chat_message_join as cmj on cmj.chat_id = chj.chat_id
    GROUP BY cmj.message_id, cmj.chat_id) as p on p.mid = m.rowid
WHERE (text is not null or attachment is not null) 
ORDER BY date
