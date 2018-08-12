SELECT
message_attachments.message_id as msg_id,
a.filename as path,
a.uti,
a.mime_type
FROM message_attachment_join AS message_attachments
LEFT JOIN attachment AS a ON message_attachments.attachment_id = a.ROWID
