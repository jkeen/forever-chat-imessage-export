
SELECT
m.ROWID as message_id,

(CASE WHEN m.madrid_roomname is null then
	replace(printf('%s|*--*|%s', m.madrid_handle, m.madrid_account), '\', '|*--*|')
 ELSE
	replace(trim(replace(substr(cast(mc.participants as text), instr(cast(mc.participants as text), '\')), X'0D', '')),'\', '|*--*|')
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
	replace(trim(replace(substr(cast(mc.participants as text), instr(cast(mc.participants as text), '\')), X'0D', '')),'\', '|*--*|')
 END) as participants,

case m.madrid_flags
when 36869 then 1
when 45061 then 0
else 0 end as 'is_from_me',

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
when 12289 then 'Received'
when 36869 then 'Sent'
when 45061 then 'Sent'
when 77825 then 'Received'
when 102405 then 'Sent' end
as type,

m.madrid_service as service,
m.flags as raw_type,
m.text as text,
cast(m.madrid_attachmentInfo as text) as _attachment_info

FROM message as m
LEFT OUTER JOIN madrid_chat as mc on m.madrid_roomname = mc.room_name
left outer join msg_pieces as mp on mp.message_id = m.rowid
where is_madrid=1 and _attachment_info is not null
