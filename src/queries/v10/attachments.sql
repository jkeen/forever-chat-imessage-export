SELECT
message_attachments.message_id as msg_id,
a.filename as attachment_path,
a.uti,
a.mime_type as attachment_mime_type
FROM message_attachment_join AS message_attachments
LEFT JOIN attachment AS a ON message_attachments.attachment_id = a.ROWID
