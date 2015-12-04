Universal Chat Format

name: 'sha'
type: string, required
description: sha1 of [address, date, text, service]

name: 'sender'
type: string, required
description: who sent the message

name: 'receiver'
type: string, required
description: The handle/phone of the person receiving the message

name: 'participants'
type: array, required
description: array of strings of handles involved in conversation. Used for grouping.
For a two person conversation, this has two entries in it. Sender and receiver are always in here.

name: 'is_from_me'
type: boolean, required
description: true if you sent the message

name: 'date'
type: (ISO 8601 date time), required
description: date message was sent/received by sender

name:'date_read'
type: (ISO 8601 date time), required
description: date message was read by receiver

name: 'date_delivered'
type: (ISO 8601 date time), required
description: date message was delivered to receiver

name: 'text'
type: string
description: the content of the message

name: 'service'
type: string
description: Service message was sent using. All lowercase, dasherized. 'imessage', 'google-hangouts', 'facebook-messenger', 'sms'

name 'attachments'
type: array
{
  path: ''
}
