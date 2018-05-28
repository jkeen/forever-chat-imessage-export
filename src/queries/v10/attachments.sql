SELECT
maj.message_id as msg_id,
a.filename as path,
a.uti,
a.mime_type
FROM message_attachment_join AS maj
LEFT JOIN attachment AS a ON maj.attachment_id = a.ROWID
