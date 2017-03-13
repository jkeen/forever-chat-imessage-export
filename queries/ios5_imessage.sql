select 
*,
m.ROWID as message_id,
m.group_id as message_group,
case mg.type
when 1 then 'Group'
else 'Individual' end as chat_type,

m.date as date,
coalesce(m.address, m.madrid_handle) as address,
NULL as account_login,
NULL as participants,
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

(SELECT GROUP_CONCAT(g.address, "|*--*|") FROM group_member as g
  WHERE g.group_id = m.group_id) AS participants,

m.flags as raw_type,
m.text as text
from message as m
LEFT OUTER JOIN msg_group as mg on m.group_id = mg.rowid
left outer join msg_pieces as mp on mp.message_id = m.rowid
where is_madrid=1
order by message_group DESC
