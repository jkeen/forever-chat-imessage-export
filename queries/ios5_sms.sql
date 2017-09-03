select
m.ROWID as msg_id,
m.group_id as message_group,
case mg.type
when 1 then 'Group'
else 'Individual' end as chat_type,

m.date as date,
coalesce(m.address, m.madrid_handle) as address,

(SELECT GROUP_CONCAT(g.address, "|*--*|") FROM group_member as g
  WHERE g.group_id = m.group_id) AS participants,

CASE m.flags when 3 then 1
when 16387 then 1
else 0
end as 'is_from_me',

strftime("%Y-%m-%dT%H:%M:%S", datetime(m.date, 'unixepoch','localtime')) as formatted_date,

(SELECT account_login from madrid_chat where account_login LIKE '%P:%' LIMIT 1) as 'me',

NULL as formatted_date_read,
NULL as formatted_date_delivered,

case m.flags
	when 2 then 'Received'
	when 3 then 'Sent'
	when 33 then 'Send Failed'
	when 129 then 'Deleted'
	when 16387 then 'Sent'
	else 'Unknown' end as type,

'sms' as service,

m.subject as subject,
m.flags as raw_type,
m.text as message_text,
mp.content_loc as attachment,
cast(mp.data as text) as attachment_data,
mp.content_type as attachment_mime_type,
mp.content_id as attachment_id

from message as m
LEFT OUTER JOIN msg_group as mg on m.group_id = mg.rowid
LEFT OUTER JOIN msg_pieces as mp on m.rowid = mp.message_id

where is_madrid=0
