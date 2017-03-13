select m.ROWID as message_id,
m.group_id as message_group,
case mg.type
when 1 then 'Group'
else 'Individual' end as chat_type,

m.date as date,
coalesce(m.address, m.madrid_handle) as address,
NULL as account_login,
NULL as participants,
NULL as 'is_from_me',
datetime(m.date, 'unixepoch','localtime') as formatted_date,
NULL as 'me',
case m.flags when 2 then 'Received' when 3 then 'Sent' when 33 then 'fail' when 129 then '*del' else 'unkn' end as type,
(SELECT GROUP_CONCAT(g.address, "|*--*|") FROM group_member as g
  WHERE m.group_id = m.group_id) AS participants,

m.flags as raw_type,
m.text as text
from message as m
LEFT OUTER JOIN msg_group as mg on m.group_id = mg.rowid
where is_madrid=0
