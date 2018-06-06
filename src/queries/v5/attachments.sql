/* This is only really used for SMS. Madrid/iMessages in these version have
some custom logic */

select
message_attachments.message_id as msg_id,
message_attachments.content_loc as attachment_path,
cast(message_attachments.data as text) as attachment_data,
message_attachments.content_type as attachment_mime_type,
message_attachments.content_id as attachment_id
FROM
msg_pieces as message_attachments
