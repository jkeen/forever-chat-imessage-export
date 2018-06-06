SELECT
m.ROWID as msg_id,

m.group_id as message_group,

CASE mg.type
WHEN 1 THEN 'Group'
ELSE 'Individual' END as chat_type,

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
(SELECT count(*) FROM msg_pieces AS mp where m.rowid = mp.message_id) as attachment_count,
cast(m.madrid_attachmentInfo as text) as _madrid_attachment_info,
is_madrid

from message as m
LEFT OUTER JOIN msg_group as mg on m.group_id = mg.rowid

where is_madrid=0


UNION


/* Madrid Flags
36869  sent
45061  sent
12289  received
77825  received containing parsed data
102405 sent message containing parsed data
32773  send error */


SELECT
m.ROWID as msg_id,

(CASE WHEN m.madrid_roomname is null then
	replace(printf('%s|*--*|%s', m.madrid_handle, m.madrid_account), '\', '|*--*|')
 ELSE
	substr(replace(trim(replace(substr(cast(mc.participants as text), instr(cast(mc.participants as text), '\')), X'0D', '')),'\', '|*--*|'), 8)
 END) as message_group,

CASE
WHEN m.madrid_roomname IS NULL then 'Individual'
ELSE 'Group'
END as chat_type,

m.date as date,
coalesce(m.address, m.madrid_handle) as address,

(CASE WHEN m.madrid_roomname is null then
	replace(printf('%s|*--*|%s', m.madrid_handle, m.madrid_account), '\', '|*--*|')
 ELSE
	substr(replace(trim(replace(substr(cast(mc.participants as text), instr(cast(mc.participants as text), '\')), X'0D', '')),'\', '|*--*|'), 8)
 END) as participants,

case m.madrid_flags
when 36869 then 1
when 45061 then 0
when 12289 then 0
when 77825 then 0
when 102405 then 1
when 32773 then 1
else -1 end as 'is_from_me',

strftime("%Y-%m-%dT%H:%M:%S", DATETIME(m.date +978307200, "unixepoch")) AS formatted_date,

m.madrid_account as 'me',

  CASE m.madrid_date_read
    WHEN 0 THEN null
    ELSE strftime("%Y-%m-%dT%H:%M:%S", DATETIME(m.madrid_date_read +978307200, "unixepoch"))
  END AS formatted_date_read,

  CASE m.madrid_date_delivered
    WHEN 0 THEN null
    ELSE strftime("%Y-%m-%dT%H:%M:%S", DATETIME(m.madrid_date_delivered +978307200, "unixepoch"))
  END AS formatted_date_delivered,

case m.madrid_flags
when 36869 then 'Sent'
when 45061 then 'Sent'
when 12289 then 'Received'
when 77825 then 'Received'
when 102405 then 'Sent'
when 32773 then 'Sent'
else 'Unknown' end as type,

'imessage' as service,

NULL as subject,
m.flags as raw_type,
m.text as message_text,
0 as attachment_count,
cast(m.madrid_attachmentInfo as text) as _madrid_attachment_info,
is_madrid
FROM message as m
LEFT OUTER JOIN madrid_chat as mc on m.madrid_roomname = mc.room_name
where is_madrid = 1
