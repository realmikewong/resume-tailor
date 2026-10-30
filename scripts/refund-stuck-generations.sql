-- One-off: refund credits for generations stranded by the Make.com outage (Aug–Oct 2026).
with stuck as (
  update generations
  set status = 'failed'
  where status = 'processing'
    and created_at < now() - interval '10 minutes'
  returning id, user_id
)
select id, user_id, refund_credit(user_id, 'refund_make_outage')
from stuck;
