-- Tools for running the platform day to day: cancel a hire on someone's behalf, change a
-- booking's dates or price after a dispute, and refund a payment. Every one records who
-- did it and why, tells both organisations, and shows up in the admin activity feed.
alter type public.admin_action_kind add value if not exists 'booking_cancelled';
alter type public.admin_action_kind add value if not exists 'booking_adjusted';
alter type public.admin_action_kind add value if not exists 'refund';
alter type public.payment_kind add value if not exists 'refund';
